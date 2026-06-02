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
  CommunitySignal,
  MatchPlan,
  MatchPlanRequest,
  Squad,
  SwapCandidate,
  SwapSuggestion,
} from "@/lib/ai/matchPlanSchema";
import { searchByProfile, findPlayerByName } from "@/lib/playerDb/queries";
import type { FcPlayer, FcPlayerPosition } from "@/lib/playerDb/types";
import { lookupProfileSignal } from "@/lib/community/lookup";
import { getProTacticsForFormation } from "@/lib/tacticsDb/tactics";

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

/** Per-squad-player insight: real card stats from fc_players (if we have the
 *  player) plus name-based community sentiment from the ingest pipeline. This
 *  lets the UI / chat explain a player using both hard data and what the
 *  community says about that SPECIFIC player. Both halves fail soft. */
type PlayerInsight = {
  name: string;
  position?: string;
  card?: SwapCandidate;
  communitySignal?: CommunitySignal;
};

async function buildPlayerInsights(squad: Squad): Promise<PlayerInsight[]> {
  const named = squad.players.filter(
    (p) => typeof p.name === "string" && p.name.trim().length > 1
  );

  const tasks = named.map(async (p): Promise<PlayerInsight | null> => {
    const [cardResult, signalResult] = await Promise.allSettled([
      findPlayerByName(p.name),
      lookupProfileSignal(p.name, "player_name"),
    ]);

    const card =
      cardResult.status === "fulfilled" && cardResult.value
        ? toSwapCandidate(cardResult.value)
        : undefined;
    const sig =
      signalResult.status === "fulfilled" && signalResult.value
        ? signalResult.value
        : undefined;

    // Skip players we know nothing extra about — keeps the payload lean.
    if (!card && !sig) return null;

    const insight: PlayerInsight = { name: p.name, position: p.position };
    if (card) insight.card = card;
    if (sig) {
      insight.communitySignal = {
        positiveCount: sig.positiveCount,
        negativeCount: sig.negativeCount,
        bucket: sig.bucket,
        topQuote: sig.topQuote,
        matchedTerm: sig.matchedTerm,
      };
    }
    return insight;
  });

  const results = await Promise.all(tasks);
  return results.filter((r): r is PlayerInsight => r !== null);
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

  let userText = buildMatchPlanUserText({
    squadJson: JSON.stringify(body.squad, null, 2),
    opponentSquadJson: body.opponentSquad
      ? JSON.stringify(body.opponentSquad, null, 2)
      : undefined,
    platform: body.platform,
    userContext: body.userContext,
    styleOverride: body.styleOverride,
    language: body.language,
  });

  // Surface real pro-player tactics that use a formation matching this squad,
  // so the plan can say "pro X runs this shape too". Fails soft.
  try {
    const proTactics = await getProTacticsForFormation(body.squad.formation, 4);
    if (proTactics.length > 0) {
      userText +=
        `\n\nPRO REFERENCE TACTICS (real FC Pro players using a formation like ` +
        `this squad's "${body.squad.formation}"):\n` +
        proTactics.map((t) => `- ${t}`).join("\n") +
        `\n\nIf one of these pro setups fits this squad, mention it by the pro's ` +
        `name in your reasoning or matchupHints (e.g. "pro X runs this shape with ` +
        `a high line"). Only cite a pro tactic when it genuinely matches; never ` +
        `invent pro names or tactics that are not listed above.`;
    }
  } catch (err) {
    console.error("getProTacticsForFormation failed", err);
  }

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

    // Enrich AI's swap suggestions with concrete candidates from fc_players,
    // and build per-squad-player insights (real card stats + name-based
    // community sentiment). Both run in parallel and fail soft — the plan is
    // still useful if the player DB or signal table is empty.
    const [enrichedSwaps, playerInsights] = await Promise.all([
      enrichSwapSuggestions(plan.swapSuggestions),
      buildPlayerInsights(body.squad).catch((err) => {
        console.error("buildPlayerInsights failed", err);
        return [] as PlayerInsight[];
      }),
    ]);
    plan.swapSuggestions = enrichedSwaps;

    return NextResponse.json({
      success: true,
      modelUsed,
      plan,
      playerInsights,
    });
  } catch (error) {
    const { message, status } = friendlyError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
