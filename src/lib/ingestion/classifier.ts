// src/lib/ingestion/classifier.ts
//
// Batched Gemini classifier. For each Reddit item we extract:
//   - sentiment (positive / neutral / negative)
//   - bucket   (positive | negative) — positive AND neutral both → positive
//                                       negative                  → negative
//   - entities: { type, value } where type ∈ player_profile,
//     playstyle, tactic, formation, position
//
// We batch up to BATCH_SIZE items per Gemini call to keep cost low and
// stay within the function timeout. The model is asked to respond with
// pure JSON keyed by item index.

import { GoogleGenAI } from "@google/genai";

export type ClassifierEntity = {
  type: "player_profile" | "playstyle" | "tactic" | "formation" | "position";
  value: string;
  normalized_value: string;
};

export type ClassifierResult = {
  sentiment: "positive" | "neutral" | "negative";
  bucket: "positive" | "negative";
  entities: ClassifierEntity[];
};

export type ClassifierInput = {
  id: string;
  text: string;
};

const CLASSIFIER_MODEL = "gemini-2.5-flash";
const BATCH_SIZE = 8;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const CLASSIFIER_SYSTEM_PROMPT = `
You are an FC26 community-signal classifier.

Input: a batch of short Reddit posts or comments about EA SPORTS FC 26.
For each item, output:

1. sentiment: "positive" | "neutral" | "negative" toward the player /
   playstyle / tactic discussed. If the item discusses nothing relevant,
   use "neutral".
2. entities: any of the following that the item explicitly recommends,
   praises, complains about, or warns against. Skip if not relevant.

ENTITY TYPES:
- "player_profile" — a TYPE of player, NOT a specific name. Examples:
    "fast defensive RB with stamina",
    "clinical ST with pace and finishing",
    "ball-playing CB with composure",
    "box-to-box CM with passing".
  If the user only names a specific player (e.g. "Mbappé"), still
  generalize them into a profile.
- "playstyle" — e.g. "high press", "possession", "counter attack",
  "drop back", "tiki-taka".
- "tactic" — instruction-level: "stay back while attacking",
  "get in behind", "cut inside", "free roam".
- "formation" — e.g. "4-3-3", "4-2-3-1(2)", "5-2-1-2".
- "position" — e.g. "RB", "CDM", "ST", "LW".

OUTPUT RULES:
- Return ONLY a valid JSON object. No prose, no markdown.
- Top-level shape:
    { "results": { "<id>": { "sentiment": "...", "entities": [...] }, ... } }
- Each entity is { "type": "...", "value": "<short descriptor>" }.
- "value" must be lowercase, concise (max ~60 chars), and self-contained
  so it can match similar mentions across items.
- If an item has no relevant entity, return entities: [].
- Do NOT invent entities that are not in the text.
`;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bucketOf(sentiment: ClassifierResult["sentiment"]): "positive" | "negative" {
  return sentiment === "negative" ? "negative" : "positive";
}

function clipText(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

type RawResponse = {
  results?: Record<
    string,
    {
      sentiment?: string;
      entities?: Array<{ type?: string; value?: string }>;
    }
  >;
};

async function classifyBatch(
  batch: ClassifierInput[]
): Promise<Map<string, ClassifierResult>> {
  const userText = [
    "Classify the following items. Respond with one JSON object keyed by id.",
    "",
    ...batch.map(
      (item) => `### id=${item.id}\n${clipText(item.text)}\n`
    ),
  ].join("\n");

  const response = await ai.models.generateContent({
    model: CLASSIFIER_MODEL,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    config: {
      systemInstruction: CLASSIFIER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const raw = (response.text ?? "").trim();
  if (!raw) return new Map();

  let parsed: RawResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("classifier: malformed JSON from Gemini", raw.slice(0, 400));
    return new Map();
  }

  const out = new Map<string, ClassifierResult>();
  const results = parsed.results ?? {};
  for (const [id, raw] of Object.entries(results)) {
    const sentiment =
      raw.sentiment === "positive" || raw.sentiment === "negative"
        ? raw.sentiment
        : "neutral";
    const entities: ClassifierEntity[] = [];
    for (const e of raw.entities ?? []) {
      if (!e?.type || !e?.value) continue;
      if (
        e.type !== "player_profile" &&
        e.type !== "playstyle" &&
        e.type !== "tactic" &&
        e.type !== "formation" &&
        e.type !== "position"
      ) {
        continue;
      }
      const value = String(e.value).trim();
      if (value.length === 0 || value.length > 120) continue;
      entities.push({
        type: e.type,
        value,
        normalized_value: normalize(value),
      });
    }
    out.set(id, {
      sentiment,
      bucket: bucketOf(sentiment),
      entities,
    });
  }
  return out;
}

export async function classifyItems(
  items: ClassifierInput[]
): Promise<Map<string, ClassifierResult>> {
  const out = new Map<string, ClassifierResult>();
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const partial = await classifyBatch(batch);
      for (const [k, v] of partial) out.set(k, v);
    } catch (err) {
      console.error("classifier batch failed", err);
    }
  }
  return out;
}

export const classifierModelId = CLASSIFIER_MODEL;
