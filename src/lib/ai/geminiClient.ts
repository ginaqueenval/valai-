// src/lib/ai/geminiClient.ts
//
// Shared Gemini client + retry/fallback logic used by all squad endpoints.
// Centralized so we don't duplicate the chain across routes.

import { GoogleGenAI } from "@google/genai";

export const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown): {
  retryable: boolean;
  status: number;
} {
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

export function friendlyError(error: unknown): {
  message: string;
  status: number;
} {
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
    // ignore
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
      message: "Rate limit reached. Please wait a minute and try again.",
      status: 429,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message:
        "Gemini rejected the API key. Check GEMINI_API_KEY in your environment.",
      status,
    };
  }
  return {
    message: parsedMessage ?? "Request failed. Please try again.",
    status: status || 500,
  };
}

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export type GenerateImageRequest = {
  base64: string;
  mimeType: string;
  userText: string;
  systemInstruction: string;
  /** Set false for chat/conversational endpoints. Default true. */
  jsonOutput?: boolean;
  /** Defaults to 16000 for JSON output, 1200 for chat. */
  maxOutputTokens?: number;
};

/** Run a vision-enabled generation with retry + model fallback. */
export async function generateImageWithRetry(args: GenerateImageRequest) {
  const {
    base64,
    mimeType,
    userText,
    systemInstruction,
    jsonOutput = true,
    maxOutputTokens = jsonOutput ? 16000 : 1200,
  } = args;

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
            systemInstruction,
            ...(jsonOutput ? { responseMimeType: "application/json" } : {}),
            maxOutputTokens,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        return { response, modelUsed: model };
      } catch (error) {
        lastError = error;
        const { retryable } = isRetryableError(error);
        if (!retryable) throw error;

        const isLast =
          attempt === 2 && modelIndex === MODEL_FALLBACK_CHAIN.length - 1;
        if (isLast) throw error;

        const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt));
        await sleep(backoffMs);
      }
    }
  }

  throw lastError ?? new Error("Exhausted model fallback chain.");
}

export type GenerateTextRequest = {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  systemInstruction: string;
  maxOutputTokens?: number;
  jsonOutput?: boolean;
};

/** Run a text-only (no image) generation with retry + model fallback. */
export async function generateTextWithRetry(args: GenerateTextRequest) {
  const {
    contents,
    systemInstruction,
    maxOutputTokens = 1200,
    jsonOutput = false,
  } = args;

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex++) {
    const model = MODEL_FALLBACK_CHAIN[modelIndex];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            ...(jsonOutput ? { responseMimeType: "application/json" } : {}),
            maxOutputTokens,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        return { response, modelUsed: model };
      } catch (error) {
        lastError = error;
        const { retryable } = isRetryableError(error);
        if (!retryable) throw error;

        const isLast =
          attempt === 2 && modelIndex === MODEL_FALLBACK_CHAIN.length - 1;
        if (isLast) throw error;

        const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt));
        await sleep(backoffMs);
      }
    }
  }

  throw lastError ?? new Error("Exhausted model fallback chain.");
}
