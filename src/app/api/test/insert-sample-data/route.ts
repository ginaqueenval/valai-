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
    {
      source_type: "reddit_post",
      external_id: "t3_should_i_do_this_debruyne_agreeable",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/",
      title: "Should i do this",
      body: "Should i do this evolution on De Bruyne 93 CDM. The evolution gives Defensive Masterclass, Finesse Shot+, Five Star Phenom, Backline Instinct, Attacker Round Out [SP+1], and Making the Case. De Bruyne stats: PAC 90 SHO 89 PAS 94 DRI 92 DEF 94 PHY 92. After evolution he gets ratings: 94.2 CM Deep-Lying Playmaker++, 94.1 CDM Deep-Lying Playmaker++, 89.3 CDM Box Crasher++, 88.5 CAM Classic 10++, 92.9 CM Box-To-Box+, 90.1 CM Playmaker+, 90.1 CAM Playmaker+. Playstyles include Intercept, Finesse Shot, Pinged Pass, Dead Ball, Incisive Pass, Inventive, Tiki Taka, Jockey, Anticipate, Quick Step.",
      author: "Agreeable_Speed8400",
      score: 22,
      created_utc: "2026-05-23T15:54:00Z",
      imageUrl: "https://i.redd.it/de-bruyne-93-cdm-evolution.jpg",
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
    {
      source_type: "reddit_comment",
      external_id: "t1_agreeable_speed8400_op_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c1",
      title: null,
      body: "I think de bruyne always had special aura so should i do this?",
      author: "Agreeable_Speed8400",
      score: 2,
      created_utc: "2026-05-23T16:00:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_psychological_ad_251_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c2",
      title: null,
      body: "He definitely has some special Aura. I do have to play him with an Engine Chem style because he is a little stiff on the ball but that's about it. His passes are strong and curve perfect and the finesse shots outside the box are fantastic.",
      author: "Psychological_Ad_251",
      score: 1,
      created_utc: "2026-05-23T16:10:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_simnil110_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c3",
      title: null,
      body: "His passing definitely has special aura, No one hits the same whipped passes + he does",
      author: "simnil110",
      score: 2,
      created_utc: "2026-05-23T16:20:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_agreeable_speed8400_op_c2",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c4",
      title: null,
      body: "I have two more options for the playstle instead of just finesse, them being tech bruiser and incisive",
      author: "Agreeable_Speed8400",
      score: 1,
      created_utc: "2026-05-23T16:30:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_rocket0421_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c5",
      title: null,
      body: "If you're playing him as a CDM, the intercept/bruiser/pinged combo is just unreasonably strong way too good. At any attacking role, finesse+ would probably be best",
      author: "Rocket0421",
      score: 1,
      created_utc: "2026-05-23T16:40:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_akavemix_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c6",
      title: null,
      body: "i would with those ps+ combo.",
      author: "akaVemiX",
      score: 2,
      created_utc: "2026-05-23T16:50:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_preferencerude5216_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c7",
      title: null,
      body: "It's your game, your team, do what you want! No need to do what others tell you to do or not to do. Most of the people on here know nothing anyway.",
      author: "PreferenceRude5216",
      score: 1,
      created_utc: "2026-05-23T17:00:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_diamondfc_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c8",
      title: null,
      body: "100% yes",
      author: "DiamondFC",
      score: 1,
      created_utc: "2026-05-24T17:00:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_billgatesalladdin_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c9",
      title: null,
      body: "Do it",
      author: "BillGatesAlladdin",
      score: 1,
      created_utc: "2026-05-24T17:10:00Z",
    },
    {
      source_type: "reddit_comment",
      external_id: "t1_s4cram3nt_c1",
      subreddit: "fut_evos",
      url: "https://www.reddit.com/r/fut_evos/comments/should_i_do_this_debruyne/#c10",
      title: null,
      body: "Looks good but try to get bruiser also on him",
      author: "s4cram3nt",
      score: 1,
      created_utc: "2026-05-24T17:20:00Z",
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
