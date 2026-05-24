// src/lib/ingestion/cardExtractor.ts
//
// Gemini Vision extractor for FC player cards found in Reddit image posts.
// Returns null if the image doesn't contain a recognisable FC card.

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type CardProfile = {
  player_name: string;
  normalized_name: string;
  card_type: string | null;
  position: string | null;
  overall_rating: number | null;
  pac: number | null;
  sho: number | null;
  pas: number | null;
  dri: number | null;
  def_stat: number | null;
  phy: number | null;
  nation: string | null;
  club: string | null;
  league: string | null;
};

const EXTRACTION_PROMPT = `You are an expert at recognising EA Sports FC (FIFA) Ultimate Team player cards.

Examine the image. If it contains an FC/FIFA Ultimate Team player card (a single card showing a player's name, rating, position, and stats), extract the data and return JSON matching this exact schema:
{
  "is_card": true,
  "player_name": "full player name as shown",
  "card_type": "e.g. Rush Evo, TOTY, Icon, Team of the Week, FUTTIES, FUT Birthday, Road to the Final, Hero, base gold, base silver, base bronze — whatever variant is shown",
  "position": "e.g. ST, CB, GK, CAM, LB, etc.",
  "overall_rating": integer or null,
  "pac": integer or null,
  "sho": integer or null,
  "pas": integer or null,
  "dri": integer or null,
  "def": integer or null,
  "phy": integer or null,
  "nation": "country name or null",
  "club": "club name or null",
  "league": "league name or null"
}

If the image does NOT contain an FC/FIFA player card (e.g. it is a squad screenshot, meme, photo, transfer news, etc.), return exactly:
{ "is_card": false }

Return only valid JSON. No markdown fences, no extra text.`;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": process.env.REDDIT_USER_AGENT ?? "valbri-fc/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    // Skip images larger than 8 MB to stay within Gemini inline-data limits.
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    return { base64: Buffer.from(buf).toString("base64"), mimeType };
  } catch {
    return null;
  }
}

export async function extractCardFromImage(imageUrl: string): Promise<CardProfile | null> {
  const img = await fetchAsBase64(imageUrl);
  if (!img) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: EXTRACTION_PROMPT },
            { inlineData: { mimeType: img.mimeType, data: img.base64 } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 512,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw = (response.text ?? "").trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    if (!raw) return null;

    let parsed: {
      is_card: boolean;
      player_name?: string;
      card_type?: string;
      position?: string;
      overall_rating?: number;
      pac?: number;
      sho?: number;
      pas?: number;
      dri?: number;
      def?: number;
      phy?: number;
      nation?: string;
      club?: string;
      league?: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!parsed.is_card || !parsed.player_name) return null;

    return {
      player_name: parsed.player_name,
      normalized_name: normalize(parsed.player_name),
      card_type: parsed.card_type ?? null,
      position: parsed.position ?? null,
      overall_rating: parsed.overall_rating ?? null,
      pac: parsed.pac ?? null,
      sho: parsed.sho ?? null,
      pas: parsed.pas ?? null,
      dri: parsed.dri ?? null,
      def_stat: parsed.def ?? null,
      phy: parsed.phy ?? null,
      nation: parsed.nation ?? null,
      club: parsed.club ?? null,
      league: parsed.league ?? null,
    };
  } catch (err) {
    console.error("extractCardFromImage failed", imageUrl, err);
    return null;
  }
}
