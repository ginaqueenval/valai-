// src/app/api/ai/squad-chat/route.ts

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type {
  ChatMessage,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const chatSystemPrompt = `
You are Valbri AI Squad Advisor — talking to a FC player about the squad they
just uploaded. The image was already analyzed and turned into a list of
PLAYER CALLOUTS that flag the cards needing attention. You will receive that
list as JSON context along with the player's platform, division, and goal.

YOUR JOB:
- Answer the player's questions about their squad: tactics, formations,
  player instructions, upgrade order, who to bench, what to do in the next
  game, etc.
- Reason out loud briefly before giving the recommendation when the question
  is non-trivial (1-2 short sentences of reasoning, then the answer).
- Ground every recommendation in the callouts you were given when relevant.
  If the question is unrelated to the callouts, answer from general FC
  tactical knowledge.

VOICE:
- Analytical engineering report tone. Precise, executive.
- No emojis. No hype. No second-person fluff.
- Plain text only, no markdown headings or code fences. Short paragraphs.

RULES:
- Do not invent player names, prices, or live market data.
- Recommend PROFILES (role + key stats / traits), not specific named players,
  unless they appear in the callouts or in the user's own message.
- Calibrate severity to the user's division (lower divisions = safer advice,
  Elite = meta-level detail).
- If the user asks something the data does not support, say so briefly.
`;

type ChatRequestBody = {
  messages?: ChatMessage[];
  analysis?: ValbriSquadAdvisorResult | null;
  platform?: string;
  divisionLevel?: string;
  goal?: string;
  currentTactics?: string;
};

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

  if (status === 503 || /unavailable|overloaded/i.test(raw)) {
    return {
      message:
        "Gemini is temporarily overloaded. Please wait a few seconds and try again.",
      status: 503,
    };
  }
  if (status === 429 || /rate limit|too many requests/i.test(raw)) {
    return {
      message: "Rate limit reached. Please wait a minute and try again.",
      status: 429,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message: "Gemini rejected the API key. Check GEMINI_API_KEY in your environment.",
      status,
    };
  }
  return { message: "Chat request failed. Please try again.", status: status || 500 };
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json(
      { success: false, error: "messages is required." },
      { status: 400 }
    );
  }

  const lastUserTurn = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserTurn || !lastUserTurn.content?.trim()) {
    return NextResponse.json(
      { success: false, error: "Last message must be from the user." },
      { status: 400 }
    );
  }

  const contextBlock = [
    `Platform: ${body.platform ?? "unknown"}`,
    `Division Rivals Level: ${body.divisionLevel ?? "unknown"}`,
    `Main Goal: ${body.goal ?? "unknown"}`,
    `Current Tactics: ${body.currentTactics && body.currentTactics.trim().length > 0 ? body.currentTactics : "not provided"}`,
    "",
    "Squad analysis callouts (JSON):",
    JSON.stringify(body.analysis?.playerCallouts ?? [], null, 2),
  ].join("\n");

  const contents = [
    {
      role: "user" as const,
      parts: [
        { text: `SQUAD CONTEXT FOR THIS CONVERSATION:\n\n${contextBlock}` },
      ],
    },
    {
      role: "model" as const,
      parts: [{ text: "Context received. Ready for tactical questions." }],
    },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    })),
  ];

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex++) {
    const model = MODEL_FALLBACK_CHAIN[modelIndex];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: chatSystemPrompt,
            maxOutputTokens: 1200,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const reply = (response.text ?? "").trim();
        if (!reply) {
          return NextResponse.json(
            { success: false, error: "Empty response from Gemini." },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          modelUsed: model,
          reply,
        });
      } catch (error) {
        lastError = error;
        const { retryable } = isRetryableError(error);
        if (!retryable) {
          const { message, status } = friendlyError(error);
          return NextResponse.json(
            { success: false, error: message },
            { status }
          );
        }

        const isLastAttemptOnLastModel =
          attempt === 2 && modelIndex === MODEL_FALLBACK_CHAIN.length - 1;
        if (isLastAttemptOnLastModel) {
          const { message, status } = friendlyError(error);
          return NextResponse.json(
            { success: false, error: message },
            { status }
          );
        }

        const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt));
        await sleep(backoffMs);
      }
    }
  }

  const { message, status } = friendlyError(
    lastError ?? new Error("Exhausted model fallback chain.")
  );
  return NextResponse.json({ success: false, error: message }, { status });
}
