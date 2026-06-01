// src/lib/cardsDb/cards.ts
//
// Read/write helpers for player_cards. The manual-load endpoint and the Reddit
// version-matcher both go through here.

import { sql } from "@/lib/db/sql";
import { ensureCardsSchema } from "./schema";

/** A single card version of a player, as supplied in the manual data feed. */
export type CardInput = {
  playerName: string;
  /** "Base", "TOTW", "FUT Birthday", "Team of the Season", etc. */
  version?: string;
  rating: number;
  position: string;
  altPositions?: string[];
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
  skillMoves?: number;
  weakFoot?: number;
  preferredFoot?: string;
  playstyles?: string[];
  playstylesPlus?: string[];
  nation?: string;
  league?: string;
  club?: string;
  imageUrl?: string;
  /** Detailed sub-stats (acceleration, vision, composure…), AcceleRATE,
   *  chemistry-style popularity, price, etc. Stored as-is for completeness. */
  details?: Record<string, unknown>;
};

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string): string {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function asInt(v: unknown, fallback = 0): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function isBaseVersion(version: string): boolean {
  const v = version.toLowerCase().trim();
  return v === "" || v === "base" || v === "gold" || v === "gold-rare" || v === "rare";
}

/** Deterministic card id so re-loading the same card updates rather than dupes. */
export function cardId(playerName: string, version: string, rating: number): string {
  return `${slug(playerName)}__${slug(version || "base")}__${rating}`;
}

export type UpsertResult = { written: number; players: number; errors: string[] };

export async function upsertCards(cards: CardInput[]): Promise<UpsertResult> {
  await ensureCardsSchema();
  const db = sql();
  const errors: string[] = [];
  const playerKeys = new Set<string>();
  let written = 0;

  for (const c of cards) {
    if (!c.playerName || !c.position || !Number.isFinite(Number(c.rating))) {
      errors.push(`skipped invalid card: ${JSON.stringify(c).slice(0, 80)}`);
      continue;
    }
    const version = (c.version ?? "Base").trim() || "Base";
    const id = cardId(c.playerName, version, asInt(c.rating));
    const key = normalizeKey(c.playerName);
    playerKeys.add(key);

    try {
      await db.query(
        `INSERT INTO player_cards
           (card_id, player_key, player_name, card_version, is_base, rating,
            position, alt_positions, pace, shooting, passing, dribbling,
            defending, physical, skill_moves, weak_foot, preferred_foot,
            playstyles, playstyles_plus, nation, league, club, image_url,
            details, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 $18,$19,$20,$21,$22,$23,$24, NOW())
         ON CONFLICT (card_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            position = EXCLUDED.position,
            alt_positions = EXCLUDED.alt_positions,
            pace = EXCLUDED.pace, shooting = EXCLUDED.shooting,
            passing = EXCLUDED.passing, dribbling = EXCLUDED.dribbling,
            defending = EXCLUDED.defending, physical = EXCLUDED.physical,
            skill_moves = EXCLUDED.skill_moves, weak_foot = EXCLUDED.weak_foot,
            preferred_foot = EXCLUDED.preferred_foot,
            playstyles = EXCLUDED.playstyles,
            playstyles_plus = EXCLUDED.playstyles_plus,
            nation = EXCLUDED.nation, league = EXCLUDED.league,
            club = EXCLUDED.club, image_url = EXCLUDED.image_url,
            details = EXCLUDED.details,
            updated_at = NOW()`,
        [
          id,
          key,
          c.playerName,
          version,
          isBaseVersion(version),
          asInt(c.rating),
          c.position.toUpperCase(),
          c.altPositions ?? [],
          asInt(c.pace),
          asInt(c.shooting),
          asInt(c.passing),
          asInt(c.dribbling),
          asInt(c.defending),
          asInt(c.physical),
          asInt(c.skillMoves, 3),
          asInt(c.weakFoot, 3),
          (c.preferredFoot ?? "Right").toLowerCase().startsWith("l") ? "Left" : "Right",
          c.playstyles ?? [],
          c.playstylesPlus ?? [],
          c.nation ?? "",
          c.league ?? "",
          c.club ?? "",
          c.imageUrl ?? null,
          c.details ? JSON.stringify(c.details) : null,
        ]
      );
      written += 1;
    } catch (err) {
      errors.push(`${c.playerName} [${version}]: ${(err as Error).message}`);
    }
  }

  return { written, players: playerKeys.size, errors };
}

export type CardStatus = {
  totalCards: number;
  totalPlayers: number;
  baseOnlyCount: number;
  baseOnlyPlayers: string[];
};

/** Summary + the list of players that still have ONLY a base card (so the
 *  operator knows whose special versions to send next). */
export async function getCardStatus(limit = 100): Promise<CardStatus> {
  await ensureCardsSchema();
  const db = sql();

  const totals = (await db.query(
    `SELECT COUNT(*)::int AS cards,
            COUNT(DISTINCT player_key)::int AS players
       FROM player_cards`
  )) as Array<{ cards: number; players: number }>;

  const baseOnly = (await db.query(
    `SELECT MAX(player_name) AS player_name
       FROM player_cards
      GROUP BY player_key
     HAVING COUNT(*) = 1
      ORDER BY MAX(rating) DESC
      LIMIT $1`,
    [limit]
  )) as Array<{ player_name: string }>;

  return {
    totalCards: totals[0]?.cards ?? 0,
    totalPlayers: totals[0]?.players ?? 0,
    baseOnlyCount: baseOnly.length,
    baseOnlyPlayers: baseOnly.map((r) => r.player_name),
  };
}

export type PlayerCardRow = {
  card_id: string;
  player_name: string;
  card_version: string;
  rating: number;
  position: string;
};

/** All versions of a player, by fuzzy name match. Used by the Reddit
 *  version-matcher to decide which card a comment is about. */
export async function getCardsForPlayer(name: string): Promise<PlayerCardRow[]> {
  await ensureCardsSchema();
  const db = sql();
  const key = normalizeKey(name);
  if (!key) return [];

  return (await db.query(
    `SELECT card_id, player_name, card_version, rating, position
       FROM player_cards
      WHERE similarity(player_key, $1) > 0.45
      ORDER BY similarity(player_key, $1) DESC, rating DESC`,
    [key]
  )) as PlayerCardRow[];
}

/** Full stored rows for a player (all columns incl. details JSONB), for
 *  inspecting exactly what's saved. Fuzzy name match. */
export async function getFullCardsForPlayer(
  name: string
): Promise<Record<string, unknown>[]> {
  await ensureCardsSchema();
  const db = sql();
  const key = normalizeKey(name);
  if (!key) return [];

  return (await db.query(
    `SELECT * FROM player_cards
      WHERE similarity(player_key, $1) > 0.4
      ORDER BY rating DESC`,
    [key]
  )) as Record<string, unknown>[];
}
