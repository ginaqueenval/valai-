// src/lib/community/lookup.ts
//
// Runtime lookup against entity_aggregates. Given a replacement profile
// string (e.g. "fast defensive RB with stamina"), find the closest
// aggregate via pg_trgm similarity and return the community signal —
// positive/negative counts and a representative quote.

import { sql } from "@/lib/db/sql";

export type CommunitySignal = {
  positiveCount: number;
  negativeCount: number;
  bucket: "positive" | "negative" | "mixed";
  topQuote?: string;
  matchedTerm: string;
  similarity: number;
};

const MIN_SIMILARITY = 0.25;
const MIN_TOTAL_MENTIONS = 2;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function lookupProfileSignal(
  profile: string,
  entityType: "player_profile" | "playstyle" | "tactic" = "player_profile"
): Promise<CommunitySignal | null> {
  const normalized = normalize(profile);
  if (normalized.length === 0) return null;

  try {
    const db = sql();
    const rows = (await db.query(
      `SELECT normalized_value,
              display_value,
              positive_count,
              negative_count,
              top_positive_quote,
              top_negative_quote,
              similarity(normalized_value, $1) AS sim
         FROM entity_aggregates
        WHERE entity_type = $2
          AND similarity(normalized_value, $1) > $3
        ORDER BY sim DESC,
                 (positive_count + negative_count) DESC
        LIMIT 1`,
      [normalized, entityType, MIN_SIMILARITY]
    )) as Array<{
      normalized_value: string;
      display_value: string;
      positive_count: number | string;
      negative_count: number | string;
      top_positive_quote: string | null;
      top_negative_quote: string | null;
      sim: number | string;
    }>;

    if (rows.length === 0) return null;
    const r = rows[0];
    const positive = Number(r.positive_count) || 0;
    const negative = Number(r.negative_count) || 0;
    if (positive + negative < MIN_TOTAL_MENTIONS) return null;

    const bucket: CommunitySignal["bucket"] =
      positive > negative * 2
        ? "positive"
        : negative > positive * 2
          ? "negative"
          : "mixed";

    const topQuote =
      bucket === "negative"
        ? (r.top_negative_quote ?? r.top_positive_quote ?? undefined)
        : (r.top_positive_quote ?? r.top_negative_quote ?? undefined);

    return {
      positiveCount: positive,
      negativeCount: negative,
      bucket,
      topQuote: topQuote ?? undefined,
      matchedTerm: r.display_value,
      similarity: Number(r.sim) || 0,
    };
  } catch (err) {
    console.error("lookupProfileSignal failed", err);
    return null;
  }
}
