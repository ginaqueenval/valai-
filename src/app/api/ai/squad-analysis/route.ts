// src/app/api/ai/squad-analysis/route.ts

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { squadAdvisorMasterPrompt } from "@/lib/ai/squadAdvisorMasterPrompt";
import type { ValbriSquadAdvisorResult } from "@/lib/ai/valbriSquadAdvisorSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
      const snippet = rawText.slice(0, 300);
      return NextResponse.json(
        {
          success: false,
          error: `Could not parse AI response as JSON (finishReason: ${finishReason ?? "unknown"}). Raw start: ${snippet}`,
          raw: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "gemini",
      result: parsed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during squad analysis.",
      },
      { status: 500 }
    );
  }
}
