// src/app/api/admin/cards/analysis/route.ts
//
// Detailed card analysis with structured insights from community feedback.
// Shows player profiles with extracted playstyles, strengths, weaknesses, etc.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/sql";
import { ensureSchema } from "@/lib/db/init";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    const db = sql();

    const rows = (await db.query(
      `SELECT
          entity_type,
          display_value,
          positive_count,
          negative_count,
          top_positive_quote,
          top_negative_quote,
          best_playstyles,
          weak_points,
          strengths,
          recommended_chemstyle,
          updated_at
       FROM entity_aggregates
       WHERE entity_type = 'player_profile'
       ORDER BY (positive_count + negative_count) DESC`
    )) as Array<{
      entity_type: string;
      display_value: string;
      positive_count: number;
      negative_count: number;
      top_positive_quote: string | null;
      top_negative_quote: string | null;
      best_playstyles: string | null;
      weak_points: string[] | null;
      strengths: string[] | null;
      recommended_chemstyle: string | null;
      updated_at: string;
    }>;

    const cards = rows.map((r) => ({
      name: r.display_value,
      sentiment: {
        positive: r.positive_count,
        negative: r.negative_count,
        total: r.positive_count + r.negative_count,
      },
      quotes: {
        positive: r.top_positive_quote,
        negative: r.top_negative_quote,
      },
      analysis: {
        bestPlaystyles: r.best_playstyles ? JSON.parse(r.best_playstyles) : null,
        strengths: r.strengths ?? [],
        weaknesses: r.weak_points ?? [],
        recommendedChemstyle: r.recommended_chemstyle,
      },
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      total: cards.length,
      cards,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
