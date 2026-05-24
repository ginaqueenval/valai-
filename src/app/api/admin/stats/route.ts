// src/app/api/admin/stats/route.ts
//
// Read-only JSON endpoint that returns pipeline stats so you can verify
// what data has been collected. No authentication — keep this non-production
// or add a CRON_SECRET check if you expose it publicly.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/sql";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = sql();

    const [sourcesRows, cardsRows, aggregatesRows, recentCardsRows, topEntitiesRows] =
      await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS total, MAX(fetched_at) AS last_fetch FROM sources`
        ),
        db.query(`SELECT COUNT(*)::int AS total FROM card_profiles`),
        db.query(`SELECT COUNT(*)::int AS total FROM entity_aggregates`),
        db.query(
          `SELECT player_name, card_type, position, overall_rating,
                  pac, sho, pas, dri, def_stat, phy,
                  nation, club, league, extracted_at
             FROM card_profiles
            ORDER BY extracted_at DESC
            LIMIT 20`
        ),
        db.query(
          `SELECT entity_type, display_value,
                  positive_count, negative_count,
                  (positive_count + negative_count) AS total_mentions
             FROM entity_aggregates
            ORDER BY total_mentions DESC
            LIMIT 20`
        ),
      ]);

    const src = (sourcesRows as Array<{ total: number; last_fetch: string | null }>)[0];
    const cards = (cardsRows as Array<{ total: number }>)[0];
    const agg = (aggregatesRows as Array<{ total: number }>)[0];

    return NextResponse.json({
      sources: {
        total: src?.total ?? 0,
        lastFetch: src?.last_fetch ?? null,
      },
      cardProfiles: {
        total: cards?.total ?? 0,
        recent: recentCardsRows,
      },
      entityAggregates: {
        total: agg?.total ?? 0,
        topMentioned: topEntitiesRows,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
