// src/lib/playerDb/queries.ts
//
// Read queries against the fc_players table. Used by the Match Plan endpoint
// to translate AI profile suggestions ("fast defensive RB with pace") into
// concrete player options.

import { sql } from "@/lib/db/sql";
import { ensurePlayerDbSchema } from "./schema";
import type { FcPlayer, PlayerProfileQuery } from "./types";

type FcPlayerRow = {
  external_id: string;
  name: string;
  normalized_name: string;
  card_type: string;
  position: string;
  alt_positions: string[];
  overall: number | string;
  pace: number | string;
  shooting: number | string;
  passing: number | string;
  dribbling: number | string;
  defending: number | string;
  physical: number | string;
  weak_foot: number | string;
  skill_moves: number | string;
  preferred_foot: string;
  workrates: string;
  playstyles: string[];
  playstyles_plus: string[];
  nation: string;
  club: string;
  league: string;
  image_url: string | null;
  price_coins: number | null;
  price_captured_at: string | null;
};

function rowToPlayer(r: FcPlayerRow): FcPlayer {
  const player: FcPlayer = {
    externalId: r.external_id,
    name: r.name,
    normalizedName: r.normalized_name,
    cardType: r.card_type,
    position: r.position as FcPlayer["position"],
    altPositions: (r.alt_positions ?? []) as FcPlayer["altPositions"],
    overall: Number(r.overall),
    pace: Number(r.pace),
    shooting: Number(r.shooting),
    passing: Number(r.passing),
    dribbling: Number(r.dribbling),
    defending: Number(r.defending),
    physical: Number(r.physical),
    weakFoot: Number(r.weak_foot),
    skillMoves: Number(r.skill_moves),
    preferredFoot: (r.preferred_foot as "Right" | "Left") ?? "Right",
    workrates: r.workrates ?? "M/M",
    playstyles: r.playstyles ?? [],
    playstylesPlus: r.playstyles_plus ?? [],
    nation: r.nation,
    club: r.club,
    league: r.league,
  };
  if (r.image_url) player.imageUrl = r.image_url;
  if (r.price_coins != null && r.price_captured_at) {
    player.priceSnapshot = {
      coins: r.price_coins,
      capturedAt: r.price_captured_at,
    };
  }
  return player;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Look up a single player by name (trigram similarity). Returns the best
 *  match if similarity passes a low threshold, else null. */
export async function findPlayerByName(name: string): Promise<FcPlayer | null> {
  const normalized = normalize(name);
  if (!normalized) return null;

  await ensurePlayerDbSchema();
  const db = sql();

  const rows = (await db.query(
    `SELECT *, similarity(normalized_name, $1) AS sim
       FROM fc_players
      WHERE similarity(normalized_name, $1) > 0.3
      ORDER BY sim DESC, overall DESC
      LIMIT 1`,
    [normalized]
  )) as FcPlayerRow[];

  if (rows.length === 0) return null;
  return rowToPlayer(rows[0]);
}

/** Search the DB for players matching a profile query. Returns up to `limit`
 *  results sorted by overall rating (higher first). Hard filters are applied
 *  via SQL WHERE clauses; soft text matching uses trigram similarity. */
export async function searchByProfile(
  q: PlayerProfileQuery
): Promise<FcPlayer[]> {
  await ensurePlayerDbSchema();
  const db = sql();

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  function add(condition: string, value: string | number) {
    params.push(value);
    conditions.push(condition.replace("$P", `$${params.length}`));
  }

  if (q.position) add(`(position = $P OR $P = ANY(alt_positions))`, q.position);
  if (typeof q.minOverall === "number") add(`overall >= $P`, q.minOverall);
  if (typeof q.minPace === "number") add(`pace >= $P`, q.minPace);
  if (typeof q.minShooting === "number") add(`shooting >= $P`, q.minShooting);
  if (typeof q.minPassing === "number") add(`passing >= $P`, q.minPassing);
  if (typeof q.minDribbling === "number") add(`dribbling >= $P`, q.minDribbling);
  if (typeof q.minDefending === "number") add(`defending >= $P`, q.minDefending);
  if (typeof q.minPhysical === "number") add(`physical >= $P`, q.minPhysical);
  if (q.anyPlaystyles && q.anyPlaystyles.length > 0) {
    add(`playstyles && $P::text[]`, formatPgArray(q.anyPlaystyles));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = typeof q.limit === "number" ? Math.min(q.limit, 50) : 5;

  const sqlText = `SELECT * FROM fc_players ${where}
    ORDER BY overall DESC, name ASC
    LIMIT ${limit}`;

  const rows = (await db.query(sqlText, params)) as FcPlayerRow[];
  return rows.map(rowToPlayer);
}

/** Postgres array literal helper. */
function formatPgArray(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",");
  return `{${escaped}}`;
}
