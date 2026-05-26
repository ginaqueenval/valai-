// src/app/api/ai/squad-extract/route.ts
//
// Step 1 of the Match Plan flow: vision-extracts the squad from an uploaded
// screenshot. Returns a SquadDraft for the user to edit / confirm before
// passing it to /api/ai/match-plan.

import { NextResponse } from "next/server";
import { squadExtractionSystemPrompt, squadExtractionUserText } from "@/lib/ai/squadExtractionPrompt";
import {
  friendlyError,
  generateImageWithRetry,
  stripCodeFences,
} from "@/lib/ai/geminiClient";
import type { SquadDraft } from "@/lib/ai/matchPlanSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const squadImage = formData.get("squadImage");

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

    const { response, modelUsed } = await generateImageWithRetry({
      base64,
      mimeType,
      userText: squadExtractionUserText,
      systemInstruction: squadExtractionSystemPrompt,
      jsonOutput: true,
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

    let draft: SquadDraft;
    try {
      draft = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini returned a malformed squad draft. Please try uploading again.",
        },
        { status: 502 }
      );
    }

    if (
      !draft ||
      typeof draft.formation !== "string" ||
      !Array.isArray(draft.players)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Squad draft missing required fields.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      modelUsed,
      draft,
    });
  } catch (error) {
    const { message, status } = friendlyError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
