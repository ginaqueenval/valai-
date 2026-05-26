// src/lib/playerDb/populate.ts
//
// Populator for the FC player database. The strategy is HYBRID:
//   - Base layer:  load a community JSON dataset (top ~1000-2000 meta players).
//   - Top-up:      optional URL-by-URL fetches for specific players the base
//                  dataset misses, e.g. recently-released TOTW cards.
//
// This module is meant to be invoked from a CLI script or a /api/cron route.
// It does NOT auto-run — populate() must be called explicitly.
//
// The community dataset format we expect (PlayerDataset below) is the union
// of fields needed to seed the fc_players table. Adapters convert other
// upstream shapes into this shape before calling upsertMany().

import { sql } from "@/lib/db/sql";
import { ensurePlayerDbSchema } from "./schema";
import type { FcPlayer } from "./types";

export type PlayerDataset = ReadonlyArray<FcPlayer>;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPgArray(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",");
  return `{${escaped}}`;
}

/** Upsert a batch of players. Idempotent — running twice on the same dataset
 *  refreshes ratings, prices, etc. without creating duplicates. */
export async function upsertMany(players: PlayerDataset): Promise<number> {
  if (players.length === 0) return 0;
  await ensurePlayerDbSchema();
  const db = sql();

  let written = 0;
  for (const p of players) {
    await db.query(
      `INSERT INTO fc_players (
         external_id, name, normalized_name, card_type,
         position, alt_positions, overall,
         pace, shooting, passing, dribbling, defending, physical,
         weak_foot, skill_moves, preferred_foot, workrates,
         playstyles, playstyles_plus,
         nation, club, league, image_url,
         price_coins, price_captured_at, updated_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6::text[], $7,
         $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17,
         $18::text[], $19::text[],
         $20, $21, $22, $23,
         $24, $25, NOW()
       )
       ON CONFLICT (external_id) DO UPDATE SET
         name = EXCLUDED.name,
         normalized_name = EXCLUDED.normalized_name,
         card_type = EXCLUDED.card_type,
         position = EXCLUDED.position,
         alt_positions = EXCLUDED.alt_positions,
         overall = EXCLUDED.overall,
         pace = EXCLUDED.pace,
         shooting = EXCLUDED.shooting,
         passing = EXCLUDED.passing,
         dribbling = EXCLUDED.dribbling,
         defending = EXCLUDED.defending,
         physical = EXCLUDED.physical,
         weak_foot = EXCLUDED.weak_foot,
         skill_moves = EXCLUDED.skill_moves,
         preferred_foot = EXCLUDED.preferred_foot,
         workrates = EXCLUDED.workrates,
         playstyles = EXCLUDED.playstyles,
         playstyles_plus = EXCLUDED.playstyles_plus,
         nation = EXCLUDED.nation,
         club = EXCLUDED.club,
         league = EXCLUDED.league,
         image_url = EXCLUDED.image_url,
         price_coins = EXCLUDED.price_coins,
         price_captured_at = EXCLUDED.price_captured_at,
         updated_at = NOW()`,
      [
        p.externalId,
        p.name,
        p.normalizedName || normalize(p.name),
        p.cardType,
        p.position,
        formatPgArray(p.altPositions),
        p.overall,
        p.pace,
        p.shooting,
        p.passing,
        p.dribbling,
        p.defending,
        p.physical,
        p.weakFoot,
        p.skillMoves,
        p.preferredFoot,
        p.workrates,
        formatPgArray(p.playstyles),
        formatPgArray(p.playstylesPlus),
        p.nation,
        p.club,
        p.league,
        p.imageUrl ?? null,
        p.priceSnapshot?.coins ?? null,
        p.priceSnapshot?.capturedAt ?? null,
      ]
    );
    written += 1;
  }
  return written;
}

/** Fetch + parse a community JSON dataset from a URL.
 *  The dataset is expected to be a top-level JSON array of records matching
 *  PlayerDataset. Adapter functions can be written for sources that publish
 *  different shapes. */
export async function loadCommunityDatasetFromUrl(
  url: string
): Promise<PlayerDataset> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Community dataset fetch failed: ${res.status} ${res.statusText}`
    );
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(
      "Community dataset is not an array. Wrap the records or write an adapter."
    );
  }
  return data as PlayerDataset;
}

/** End-to-end: load + upsert. Returns how many rows were written. */
export async function populateFromUrl(url: string): Promise<number> {
  const dataset = await loadCommunityDatasetFromUrl(url);
  return upsertMany(dataset);
}
