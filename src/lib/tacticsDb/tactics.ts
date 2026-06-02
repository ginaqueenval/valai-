// src/lib/tacticsDb/tactics.ts
//
// Read/write helpers for pro_tactics.

import { sql } from "@/lib/db/sql";
import { ensureTacticsSchema } from "./schema";

export type PlayerRole = {
  /** Position label, e.g. "ST", "LM", "CB". */
  position: string;
  /** Role name if known (e.g. "Advanced Forward"); optional. */
  role?: string;
  /** Role focus chip: "++", "+", or "" (the green role-fit indicator). */
  focus?: string;
};

export type TacticInput = {
  name: string;
  author?: string;
  gameCode?: string;
  formation: string;
  buildUpStyle?: string;
  defensiveApproach?: string;
  lineHeight?: number;
  strengths?: string[];
  weaknesses?: string[];
  playerRoles?: PlayerRole[];
  source?: string;
  details?: Record<string, unknown>;
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

export function tacticId(name: string, author: string): string {
  return `${slug(author || "x")}__${slug(name)}`;
}

export type UpsertResult = { written: number; errors: string[] };

export async function upsertTactics(tactics: TacticInput[]): Promise<UpsertResult> {
  await ensureTacticsSchema();
  const db = sql();
  const errors: string[] = [];
  let written = 0;

  for (const t of tactics) {
    if (!t.name || !t.formation) {
      errors.push(`skipped (needs name + formation): ${JSON.stringify(t).slice(0, 80)}`);
      continue;
    }
    const id = tacticId(t.name, t.author ?? "");
    const lineHeight =
      typeof t.lineHeight === "number" && Number.isFinite(t.lineHeight)
        ? Math.round(t.lineHeight)
        : null;

    try {
      await db.query(
        `INSERT INTO pro_tactics
           (tactic_id, name, author, game_code, formation, build_up_style,
            defensive_approach, line_height, strengths, weaknesses,
            player_roles, source, details, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
         ON CONFLICT (tactic_id) DO UPDATE SET
            name = EXCLUDED.name, author = EXCLUDED.author,
            game_code = EXCLUDED.game_code, formation = EXCLUDED.formation,
            build_up_style = EXCLUDED.build_up_style,
            defensive_approach = EXCLUDED.defensive_approach,
            line_height = EXCLUDED.line_height,
            strengths = EXCLUDED.strengths, weaknesses = EXCLUDED.weaknesses,
            player_roles = EXCLUDED.player_roles, source = EXCLUDED.source,
            details = EXCLUDED.details, updated_at = NOW()`,
        [
          id,
          t.name,
          t.author ?? "",
          t.gameCode ?? null,
          t.formation,
          t.buildUpStyle ?? null,
          t.defensiveApproach ?? null,
          lineHeight,
          t.strengths ?? [],
          t.weaknesses ?? [],
          t.playerRoles ? JSON.stringify(t.playerRoles) : null,
          t.source ?? "",
          t.details ? JSON.stringify(t.details) : null,
        ]
      );
      written += 1;
    } catch (err) {
      errors.push(`${t.name}: ${(err as Error).message}`);
    }
  }

  return { written, errors };
}

export type TacticStatus = {
  total: number;
  byFormation: Record<string, number>;
};

export async function getTacticStatus(): Promise<TacticStatus> {
  await ensureTacticsSchema();
  const db = sql();
  const rows = (await db.query(
    `SELECT formation, COUNT(*)::int AS n FROM pro_tactics GROUP BY formation ORDER BY n DESC`
  )) as Array<{ formation: string; n: number }>;
  const byFormation: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byFormation[r.formation] = r.n;
    total += r.n;
  }
  return { total, byFormation };
}

/** Pro tactics, optionally filtered by formation. Used to give the Match Plan
 *  AI real "what the pros run" reference setups. */
export async function getTactics(formation?: string, limit = 20): Promise<Record<string, unknown>[]> {
  await ensureTacticsSchema();
  const db = sql();
  if (formation) {
    return (await db.query(
      `SELECT * FROM pro_tactics WHERE formation ILIKE $1 ORDER BY updated_at DESC LIMIT $2`,
      [`%${formation}%`, limit]
    )) as Record<string, unknown>[];
  }
  return (await db.query(
    `SELECT * FROM pro_tactics ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  )) as Record<string, unknown>[];
}
