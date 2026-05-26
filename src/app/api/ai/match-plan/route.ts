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
} from "@/lib/ai/matchPlanSchema";

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
    platform: body.platform,
    userContext: body.userContext,
    styleOverride: body.styleOverride,
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
