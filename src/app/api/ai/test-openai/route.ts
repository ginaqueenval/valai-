// src/app/api/ai/test-openai/route.ts

import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content:
            "Say exactly this sentence: Valai OpenAI connection is working.",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown OpenAI connection error.",
      },
      { status: 500 }
    );
  }
}