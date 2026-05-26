// src/app/api/ai/squad-chat/route.ts
//
// Follow-up chat after a Match Plan has been generated. The AI receives:
//   - the confirmed Squad
//   - the current MatchPlan (the plan it just gave the user)
//   - the conversation history
//
// It answers in plain text. If the user requests a style change or a
// significant tactical pivot, the assistant should explain the change
// conversationally — a fresh MatchPlan is produced by calling /api/ai/match-plan
// with a styleOverride, not by this endpoint.

import { NextResponse } from "next/server";
import { friendlyError, generateTextWithRetry } from "@/lib/ai/geminiClient";
import type {
  ChatMessage,
  MatchPlan,
  Squad,
} from "@/lib/ai/matchPlanSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatSystemPrompt = `
You are Valbri AI Coach in conversation with a Football Club player about the
squad they uploaded and the Match Plan you already produced for them.

YOUR JOB:
- Answer questions about the plan, the squad, specific players, instructions,
  or general FC tactics.
- Be concrete. Reference specific players and positions from the squad.
- 1-2 sentences of reasoning, then the answer.

WHEN THE USER ASKS FOR A NEW STYLE OR A BIG TACTICAL PIVOT:
- Acknowledge the change.
- Tell them in 2-3 sentences how the plan would shift (which players move,
  which instructions change, what risks emerge).
- Then tell them: "I can rebuild the full Match Plan for that style — just
  ask me to."
- Do NOT try to produce a full new plan in chat. The full re-plan happens via
  a separate flow.

VOICE:
- Direct coach tone. No emojis, no hype.
- Plain text. No markdown headings or code fences. Short paragraphs.

RULES:
- Do not invent player names. Use names from the squad context.
- Custom tactic slider values are 1-10.
- Player instructions must use FC's actual wording ("Stay Wide", "Get Into
  Box for Cross", etc.).
- If a question can't be answered from the squad or general FC knowledge,
  say so briefly.
`;

type ChatRequestBody = {
  messages?: ChatMessage[];
  squad?: Squad | null;
  plan?: MatchPlan | null;
  platform?: string;
  userContext?: string;
};

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
    `User context: ${body.userContext && body.userContext.trim().length > 0 ? body.userContext : "not provided"}`,
    "",
    "Confirmed Squad (JSON):",
    JSON.stringify(body.squad ?? null, null, 2),
    "",
    "Current Match Plan (JSON):",
    JSON.stringify(body.plan ?? null, null, 2),
  ].join("\n");

  const contents = [
    {
      role: "user" as const,
      parts: [
        { text: `CONTEXT FOR THIS CONVERSATION:\n\n${contextBlock}` },
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

  try {
    const { response, modelUsed } = await generateTextWithRetry({
      contents,
      systemInstruction: chatSystemPrompt,
      maxOutputTokens: 1200,
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
      modelUsed,
      reply,
    });
  } catch (error) {
    const { message, status } = friendlyError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
