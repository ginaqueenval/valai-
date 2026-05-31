// src/app/api/cron/players/route.ts
//
// One-shot (or occasional) loader for the fc_players roster.
//
// Visit /api/cron/players to pull a community FC26 player dataset (CSV or
// JSON) and upsert players with overall >= MIN into the fc_players table.
// Idempotent: re-running refreshes ratings without creating duplicates.
//
// Source URL resolution (first non-empty wins):
//   1. ?url= query param
//   2. PLAYER_DATASET_URL env var
//   3. DEFAULT_DATASET_URL below (EAFC26-DataHub data/players.csv)
//
// Min overall: ?min= query param, else PLAYER_DATASET_MIN_OVERALL env, else 80.
//
// The response includes the source's detected column names + a small sample,
// so if 0 players import we can see whether the column mapping needs a tweak.

import { NextResponse } from "next/server";
import { populateFromDatasetUrl } from "@/lib/playerDb/populate";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DEFAULT_DATASET_URL =
  "https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv";

async function handle(request: Request) {
  const { searchParams } = new URL(request.url);
  const url =
    searchParams.get("url") ||
    process.env.PLAYER_DATASET_URL ||
    DEFAULT_DATASET_URL;
  const min = Number(
    searchParams.get("min") ?? process.env.PLAYER_DATASET_MIN_OVERALL ?? "80"
  );

  try {
    const report = await populateFromDatasetUrl(url, Number.isFinite(min) ? min : 80);
    return NextResponse.json({ success: true, url, minOverall: min, report });
  } catch (err) {
    console.error("player dataset populate failed", err);
    return NextResponse.json(
      { success: false, url, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
