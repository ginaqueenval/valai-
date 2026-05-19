// src/app/api/ai/squad-analysis/route.ts

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { squadAdvisorMasterPrompt } from "@/lib/ai/squadAdvisorMasterPrompt";
import type { ValbriSquadAdvisorResult } from "@/lib/ai/valbriSquadAdvisorSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "OPENAI_API_KEY is missing." },
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
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const userText = [
      `Platform: ${platform ?? "unknown"}`,
      `Division Rivals Level: ${divisionLevel ?? "unknown"}`,
      `Main Goal: ${goal ?? "unknown"}`,
      `Current Tactics: ${currentTactics && String(currentTactics).trim().length > 0 ? currentTactics : "not provided"}`,
      "",
      "Analyze the attached FC squad screenshot. Return only valid JSON that matches the schema in your instructions.",
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: squadAdvisorMasterPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "Empty response from OpenAI." },
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
          error: "Could not parse AI response as JSON.",
          raw: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "openai",
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
