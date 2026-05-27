// src/app/api/ai/match-plan/route.ts
//
// Step 2 of the Match Plan flow: given a confirmed Squad (plus optional user
// context and optional style override), generate a MatchPlan.
//
// This endpoint is text-only — the user has already confirmed the lineup, so
// the AI does not need to see the image again. Sending only JSON keeps the
// request cheap and the parsing reliable.

import { NextResponse } from "next/server";
import {
  buildMatchPlanUserText,
  matchPlanSystemPrompt,
} from "@/lib/ai/matchPlanPrompt";
import {
  friendlyError,
  generateTextWithRetry,
  stripCodeFences,
} from "@/lib/ai/geminiClient";
import type {
  MatchPlan,
  MatchPlanRequest,
  Squad,
  SwapCandidate,
  SwapSuggestion,
} from "@/lib/ai/matchPlanSchema";
import { searchByProfile } from "@/lib/playerDb/queries";
import type { FcPlayer, FcPlayerPosition } from "@/lib/playerDb/types";
import { lookupProfileSignal } from "@/lib/community/lookup";

export const runtime = "nodejs";
export const maxDuration = 60;

function validateSquad(squad: unknown): squad is Squad {
  if (!squad || typeof squad !== "object") return false;
  const s = squad as Squad;
  if (typeof s.formation !== "string") return false;
  if (!Array.isArray(s.players)) return false;
  if (s.players.length < 11) return false;
  return true;
}

const KNOWN_POSITIONS = new Set<FcPlayerPosition>([
  "GK",
  "RB", "LB", "CB",
  "CDM", "CM", "CAM",
  "RM", "LM",
  "RW", "LW",
  "CF", "ST",
]);

function toFcPosition(label: string): FcPlayerPosition | undefined {
  const upper = label.toUpperCase();
  return KNOWN_POSITIONS.has(upper as FcPlayerPosition)
    ? (upper as FcPlayerPosition)
    : undefined;
}

function toSwapCandidate(p: FcPlayer): SwapCandidate {
  const c: SwapCandidate = {
    externalId: p.externalId,
    name: p.name,
    position: p.position,
    overall: p.overall,
    pace: p.pace,
    shooting: p.shooting,
    passing: p.passing,
    dribbling: p.dribbling,
    defending: p.defending,
    physical: p.physical,
    playstyles: p.playstyles,
  };
  if (p.imageUrl) c.imageUrl = p.imageUrl;
  return c;
}

/** For each AI-suggested swap, attach two enrichments in parallel:
 *    - candidates: concrete players from fc_players matching the filters
 *    - communitySignal: aggregated Reddit / Twitter sentiment for the profile
 *  Both lookups fail soft. A plan is still useful without either, so the
 *  swap is returned with empty / undefined fields and the caller logs. */
async function enrichSwapSuggestions(
  suggestions: SwapSuggestion[] | undefined
): Promise<SwapSuggestion[]> {
  if (!suggestions || suggestions.length === 0) return [];

  const tasks = suggestions.map(async (s): Promise<SwapSuggestion> => {
    const position = toFcPosition(s.position);

    const [candidatesResult, signalResult] = await Promise.allSettled([
      searchByProfile({
        position,
        minOverall: s.filters?.minOverall,
        minPace: s.filters?.minPace,
        minShooting: s.filters?.minShooting,
        minPassing: s.filters?.minPassing,
        minDribbling: s.filters?.minDribbling,
        minDefending: s.filters?.minDefending,
        minPhysical: s.filters?.minPhysical,
        anyPlaystyles: s.filters?.anyPlaystyles,
        limit: 5,
      }),
      lookupProfileSignal(s.profile, "player_profile"),
    ]);

    let candidates: SwapCandidate[] = [];
    if (candidatesResult.status === "fulfilled") {
      candidates = candidatesResult.value.map(toSwapCandidate);
    } else {
      console.error("swap suggestion DB lookup failed", candidatesResult.reason);
    }

    const enriched: SwapSuggestion = { ...s, candidates };

    if (signalResult.status === "fulfilled" && signalResult.value) {
      // lookupProfileSignal returns a `similarity` field we don't surface.
      const sig = signalResult.value;
      enriched.communitySignal = {
        positiveCount: sig.positiveCount,
        negativeCount: sig.negativeCount,
        bucket: sig.bucket,
        topQuote: sig.topQuote,
        matchedTerm: sig.matchedTerm,
      };
    } else if (signalResult.status === "rejected") {
      console.error(
        "swap suggestion community signal lookup failed",
        signalResult.reason
      );
    }

    return enriched;
  });

  return Promise.all(tasks);
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  let body: MatchPlanRequest;
  try {
    body = (await request.json()) as MatchPlanRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!validateSquad(body.squad)) {
    return NextResponse.json(
      {
        success: false,
        error: "A confirmed squad with at least 11 players is required.",
      },
      { status: 400 }
    );
  }

  const userText = buildMatchPlanUserText({
    squadJson: JSON.stringify(body.squad, null, 2),
    opponentSquadJson: body.opponentSquad
      ? JSON.stringify(body.opponentSquad, null, 2)
      : undefined,
    platform: body.platform,
    userContext: body.userContext,
    styleOverride: body.styleOverride,
    language: body.language,
  });

  try {
    const { response, modelUsed } = await generateTextWithRetry({
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
      systemInstruction: matchPlanSystemPrompt,
      jsonOutput: true,
      maxOutputTokens: 4000,
    });

    const rawText = (response.text ?? "").trim();
    const finishReason = response.candidates?.[0]?.finishReason;

    if (!rawText) {
      return NextResponse.json(
        {
          success: false,
          error: `Empty response from Gemini (finishReason: ${finishReason ?? "unknown"}).`,
        },
        { status: 502 }
      );
    }

    const cleaned = stripCodeFences(rawText);

    let plan: MatchPlan;
    try {
      plan = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini returned a malformed match plan. Please try again.",
        },
        { status: 502 }
      );
    }

    // Enrich AI's swap suggestions with concrete candidates from fc_players.
    // If the table is empty or queries fail, suggestions return without
    // candidates — the plan is still useful.
    plan.swapSuggestions = await enrichSwapSuggestions(plan.swapSuggestions);

    return NextResponse.json({
      success: true,
      modelUsed,
      plan,
    });
  } catch (error) {
    const { message, status } = friendlyError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
