// src/app/api/ai/squad-analysis/route.ts

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { squadAdvisorMasterPrompt } from "@/lib/ai/squadAdvisorMasterPrompt";
import type { ValbriSquadAdvisorResult } from "@/lib/ai/valbriSquadAdvisorSchema";
import { lookupProfileSignal } from "@/lib/community/lookup";

async function enrichWithCommunitySignal(
  result: ValbriSquadAdvisorResult
): Promise<void> {
  const callouts = result.playerCallouts ?? [];
  if (callouts.length === 0) return;

  // Only callouts with a replacement profile get enriched.
  const tasks = callouts.map(async (callout) => {
    const replacement = callout.recommendedReplacement;
    if (!replacement?.profile) return;
    try {
      const signal = await lookupProfileSignal(replacement.profile, "player_profile");
      if (signal) {
        replacement.communitySignal = {
          positiveCount: signal.positiveCount,
          negativeCount: signal.negativeCount,
          bucket: signal.bucket,
          topQuote: signal.topQuote,
          matchedTerm: signal.matchedTerm,
        };
      }
    } catch (err) {
      console.error("community signal lookup failed", err);
    }
  });

  await Promise.all(tasks);
}

export const runtime = "nodejs";
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): { retryable: boolean; status: number } {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/(\d{3})/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  const lower = message.toLowerCase();
  const retryable =
    status === 503 ||
    status === 502 ||
    status === 504 ||
    status === 429 ||
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests");
  return { retryable, status };
}

function friendlyError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error);
  const { status } = isRetryableError(error);

  let parsedMessage: string | null = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      parsedMessage = obj?.error?.message ?? obj?.message ?? null;
    }
  } catch {
    // Ignore JSON parse failure; fall through to raw text
  }

  if (status === 503 || /unavailable|overloaded/i.test(raw)) {
    return {
      message:
        "Gemini is temporarily overloaded. Please wait a few seconds and try again.",
      status: 503,
    };
  }
  if (status === 429 || /rate limit|too many requests/i.test(raw)) {
    return {
      message:
        "Rate limit reached. Please wait a minute and try again.",
      status: 429,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message: "Gemini rejected the API key. Check GEMINI_API_KEY in your environment.",
      status,
    };
  }
  return {
    message: parsedMessage ?? "Squad analysis failed. Please try again.",
    status: status || 500,
  };
}

type GenerateArgs = {
  base64: string;
  mimeType: string;
  userText: string;
};

async function generateWithRetry({ base64, mimeType, userText }: GenerateArgs) {
  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex++) {
    const model = MODEL_FALLBACK_CHAIN[modelIndex];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: userText },
                { inlineData: { mimeType, data: base64 } },
              ],
            },
          ],
          config: {
            systemInstruction: squadAdvisorMasterPrompt,
            responseMimeType: "application/json",
            maxOutputTokens: 16000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        return { response, modelUsed: model };
      } catch (error) {
        lastError = error;
        const { retryable } = isRetryableError(error);
        if (!retryable) {
          throw error;
        }

        const isLastAttemptOnLastModel =
          attempt === 2 && modelIndex === MODEL_FALLBACK_CHAIN.length - 1;
        if (isLastAttemptOnLastModel) {
          throw error;
        }

        const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt));
        await sleep(backoffMs);
      }
    }
  }

  throw lastError ?? new Error("Exhausted model fallback chain.");
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const squadImage = formData.get("squadImage");
  const platform = formData.get("platform");
  const divisionLevel = formData.get("divisionLevel");
  const goal = formData.get("goal");
  const currentTactics = formData.get("currentTactics");

  if (!(squadImage instanceof File) || squadImage.size === 0) {
    return NextResponse.json(
      { success: false, error: "Squad screenshot is required." },
      { status: 400 }
    );
  }

  const maxBytes = 10 * 1024 * 1024;
  if (squadImage.size > maxBytes) {
    return NextResponse.json(
      { success: false, error: "Image is too large (max 10MB)." },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await squadImage.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = squadImage.type || "image/png";

    const userText = [
      `Platform: ${platform ?? "unknown"}`,
      `Division Rivals Level: ${divisionLevel ?? "unknown"}`,
      `Main Goal: ${goal ?? "unknown"}`,
      `Current Tactics: ${currentTactics && String(currentTactics).trim().length > 0 ? currentTactics : "not provided"}`,
      "",
      "Analyze the attached FC squad screenshot. Return only valid JSON that matches the schema in your system instructions.",
    ].join("\n");

    const { response, modelUsed } = await generateWithRetry({
      base64,
      mimeType,
      userText,
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

    let parsed: ValbriSquadAdvisorResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini returned a malformed response. Please try again.",
        },
        { status: 502 }
      );
    }

    await enrichWithCommunitySignal(parsed);

    return NextResponse.json({
      success: true,
      mode: "gemini",
      modelUsed,
      result: parsed,
    });
  } catch (error) {
    const { message, status } = friendlyError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
