// src/app/api/test/insert-sample-data/route.ts
//
// Test endpoint to insert sample Reddit data for testing the pipeline.
// Supports both GET (auto-insert from sample-reddit-data.json) and POST.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/sql";
import { ensureSchema } from "@/lib/db/init";
import { readFileSync } from "fs";
import { join } from "path";

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

const SAMPLE_DATA: { posts: SampleItem[]; comments: SampleItem[] } = {
  posts: [
    {
      source_type: "reddit_post",
      external_id: "t3_da_cunha_tielemans_brutalPaste",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/",
      title: "Da Cunha 93 or Tielemans",
      body: "Da Cunha 93 or Tielemans - need advice on which card to get for my team. Da Cunha has been a mainstay in my silver team. The stats look insane on this evolution player card.",
      author: "BrutalPaste",
      score: 11,
      created_utc: "2026-05-25T19:20:00Z",
      imageUrl: "https://i.redd.it/da-cunha-93-card.jpg",
    },
  ],
  comments: [
    {
      source_type: "reddit_comment",
      external_id: "t1_thenightkingoo_comment_1",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c1",
      title: null,
      body: "Id honestly pick Da Cunha. He looks insane with those stats",
      author: "TheNightKing00",
      score: 1,
      created_utc: "2026-05-25T19:25:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_brutalpaste_comment_1",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c2",
      title: null,
      body: "I'm thinking of doing it anyway because yeah the stats are pretty crazy",
      author: "BrutalPaste",
      score: 1,
      created_utc: "2026-05-25T19:30:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_thenightkingoo_comment_2",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c3",
      title: null,
      body: "Do you know if he gets the win upgrade on top of this evolution (if they win ofc)?",
      author: "TheNightKing00",
      score: 1,
      created_utc: "2026-05-25T19:35:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_thenightkingoo_comment_3",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c4",
      title: null,
      body: "Yes he will, ive done a showdown upgrade on mastantuono before they won and he did get upgraded. But remember that if your evo stats are higher than the expected upgrade stats, theyl stay the same.. only the others will upgrade.. if that makes sense",
      author: "TheNightKing00",
      score: 1,
      created_utc: "2026-05-25T19:40:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_brutalpaste_comment_2",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c5",
      title: null,
      body: "Okay thanks that makes sense!",
      author: "BrutalPaste",
      score: 1,
      created_utc: "2026-05-25T19:45:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_prokenny_comment_1",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c6",
      title: null,
      body: "No lengthy no party.",
      author: "prokenny",
      score: 1,
      created_utc: "2026-05-25T19:50:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_infamouscattle3223_comment_1",
      subreddit: "FC_26",
      url: "https://www.reddit.com/r/FC_26/comments/da_cunha_tielemans/#c7",
      title: null,
      body: "Da Cunha has been a mainstay in my silver team the whole season so as soon as i saw this SBC it got me thinking. Players have varied stats: PAC 91 SHO 88 PAS 93 DRI 91 DEF 93 PHY 93",
      author: "InfamousCattle3223",
      score: 1,
      created_utc: "2026-05-25T19:55:00Z",
    },
  ],
};

async function insertItems(items: SampleItem[]): Promise<number> {
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

      if (rows[0]) inserted++;
    } catch (err) {
      console.error(`Failed to insert ${item.external_id}:`, err);
    }
  }

  return inserted;
}

async function handle(items: SampleItem[]) {
  try {
    await ensureSchema();

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No items provided" }, { status: 400 });
    }

    const inserted = await insertItems(items);

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

export async function GET() {
  const items = [...SAMPLE_DATA.posts, ...SAMPLE_DATA.comments];
  return handle(items);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { posts?: SampleItem[]; comments?: SampleItem[] };
  const items = [...(body.posts ?? []), ...(body.comments ?? [])];
  return handle(items);
}
