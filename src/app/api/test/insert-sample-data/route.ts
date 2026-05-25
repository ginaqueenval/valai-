// src/app/api/test/insert-sample-data/route.ts
//
// Test endpoint to insert sample Reddit data for testing the pipeline.
// This helps verify the classifier and aggregation logic without needing
// actual Reddit API access.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/sql";
import { ensureSchema } from "@/lib/db/init";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SampleItem = {
  source_type: "reddit_post" | "reddit_comment";
  external_id: string;
  subreddit: string;
  url: string;
  title: string | null;
  body: string;
  author: string | null;
  score: number;
  created_utc: string;
  imageUrl?: string | null;
};

export async function POST(request: Request) {
  try {
    await ensureSchema();

    const body = await request.json() as { posts?: SampleItem[]; comments?: SampleItem[] };
    const items = [...(body.posts ?? []), ...(body.comments ?? [])];

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No items provided" }, { status: 400 });
    }

    const db = sql();
    let inserted = 0;

    for (const item of items) {
      try {
        const rows = (await db.query(
          `INSERT INTO sources
             (source_type, external_id, subreddit, url, title, body, author, score, created_utc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (external_id) DO UPDATE
             SET score = EXCLUDED.score, fetched_at = NOW()
           RETURNING id`,
          [
            item.source_type,
            item.external_id,
            item.subreddit,
            item.url,
            item.title,
            item.body,
            item.author,
            item.score,
            new Date(item.created_utc),
          ]
        )) as Array<{ id: string }>;

        if (rows[0]) {
          inserted++;
        }
      } catch (err) {
        console.error(`Failed to insert ${item.external_id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Inserted ${inserted} items`,
      inserted,
      total: items.length,
    });
  } catch (err) {
    console.error("Insert sample data failed:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
