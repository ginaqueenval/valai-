// src/app/api/test/seed-card-analysis/route.ts
//
// Seeds entity_aggregates table with manually-analyzed card insights.
// This bypasses Reddit harvest + Gemini classification (which are blocked)
// and provides immediate working data to view at /api/admin/cards/analysis.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/sql";
import { ensureSchema } from "@/lib/db/init";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CardSeed = {
  display_value: string;
  positive_count: number;
  negative_count: number;
  top_positive_quote: string;
  top_negative_quote: string | null;
  best_playstyles: Record<string, string>;
  strengths: string[];
  weak_points: string[];
  recommended_chemstyle: string | null;
};

const CARD_SEEDS: CardSeed[] = [
  {
    display_value: "Da Cunha 93 Evolution",
    positive_count: 7,
    negative_count: 0,
    top_positive_quote:
      "Id honestly pick Da Cunha. He looks insane with those stats",
    top_negative_quote: null,
    best_playstyles: {
      CDM: "Box-To-Box, Anchor with defensive masterclass",
      CM: "Box-To-Box, balanced midfielder",
    },
    strengths: [
      "Insane stats overall",
      "Mainstay in silver teams all season",
      "Strong PAC 91, PAS 93, DEF 93, PHY 93",
      "Eligible for win upgrade on top of evolution",
    ],
    weak_points: [],
    recommended_chemstyle: "Shadow",
  },
  {
    display_value: "De Bruyne 93 CDM Evolution",
    positive_count: 10,
    negative_count: 0,
    top_positive_quote:
      "If you're playing him as a CDM, the intercept/bruiser/pinged combo is just unreasonably strong way too good. At any attacking role, finesse+ would probably be best",
    top_negative_quote:
      "I do have to play him with an Engine Chem style because he is a little stiff on the ball",
    best_playstyles: {
      CDM: "Intercept + Bruiser + Pinged Pass (unreasonably strong)",
      CM: "Deep-Lying Playmaker++ with Pinged Pass and Incisive Pass",
      CAM: "Classic 10++ with Finesse Shot+",
      "Attacking roles": "Finesse Shot+ as primary playstyle",
    },
    strengths: [
      "Special aura in passing - best whipped passes in the game",
      "Finesse shots outside the box are fantastic",
      "Strong passes and curve perfect",
      "Multiple high-rated role ratings (94.2 CM DLP++, 94.1 CDM DLP++)",
      "Versatile across CDM, CM, and CAM positions",
    ],
    weak_points: [
      "A little stiff on the ball",
      "Needs chemistry style to compensate for movement",
    ],
    recommended_chemstyle: "Engine",
  },
];

export async function GET() {
  try {
    await ensureSchema();
    const db = sql();

    let inserted = 0;

    for (const seed of CARD_SEEDS) {
      const normalized = seed.display_value.toLowerCase().trim();

      await db.query(
        `INSERT INTO entity_aggregates
           (entity_type, normalized_value, display_value,
            positive_count, negative_count,
            top_positive_quote, top_negative_quote,
            best_playstyles, weak_points, strengths, recommended_chemstyle,
            updated_at)
         VALUES ('player_profile', $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, NOW())
         ON CONFLICT (entity_type, normalized_value) DO UPDATE
           SET display_value = EXCLUDED.display_value,
               positive_count = EXCLUDED.positive_count,
               negative_count = EXCLUDED.negative_count,
               top_positive_quote = EXCLUDED.top_positive_quote,
               top_negative_quote = EXCLUDED.top_negative_quote,
               best_playstyles = EXCLUDED.best_playstyles,
               weak_points = EXCLUDED.weak_points,
               strengths = EXCLUDED.strengths,
               recommended_chemstyle = EXCLUDED.recommended_chemstyle,
               updated_at = NOW()`,
        [
          normalized,
          seed.display_value,
          seed.positive_count,
          seed.negative_count,
          seed.top_positive_quote,
          seed.top_negative_quote,
          JSON.stringify(seed.best_playstyles),
          seed.weak_points,
          seed.strengths,
          seed.recommended_chemstyle,
        ]
      );
      inserted += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted} card analyses`,
      inserted,
      next: "Visit /api/admin/cards/analysis to view the data",
    });
  } catch (err) {
    console.error("[seed-card-analysis] error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
