// src/lib/playerDb/schema.ts
//
// Idempotent DDL for the FC player database. Called by ensurePlayerDbSchema()
// from server code that needs the table available.
//
// We keep this separate from src/lib/db/init.ts because:
//   - That file is the community-signal pipeline schema, which is independent.
//   - Player DB is queried on Match Plan generation; community signal is
//     queried during AI enrichment. Keeping them split makes intent clear.

import { sql } from "@/lib/db/sql";

let initialized = false;

const SCHEMA_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS fc_players (
  external_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'gold-rare',
  position TEXT NOT NULL,
  alt_positions TEXT[] NOT NULL DEFAULT '{}',
  overall INTEGER NOT NULL,
  pace INTEGER NOT NULL,
  shooting INTEGER NOT NULL,
  passing INTEGER NOT NULL,
  dribbling INTEGER NOT NULL,
  defending INTEGER NOT NULL,
  physical INTEGER NOT NULL,
  weak_foot INTEGER NOT NULL DEFAULT 3,
  skill_moves INTEGER NOT NULL DEFAULT 3,
  preferred_foot TEXT NOT NULL DEFAULT 'Right',
  workrates TEXT NOT NULL DEFAULT 'M/M',
  playstyles TEXT[] NOT NULL DEFAULT '{}',
  playstyles_plus TEXT[] NOT NULL DEFAULT '{}',
  nation TEXT NOT NULL DEFAULT '',
  club TEXT NOT NULL DEFAULT '',
  league TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  price_coins INTEGER,
  price_captured_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fc_players_position ON fc_players(position);
CREATE INDEX IF NOT EXISTS idx_fc_players_overall ON fc_players(overall DESC);
CREATE INDEX IF NOT EXISTS idx_fc_players_name_trgm
  ON fc_players USING gin(normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fc_players_stats
  ON fc_players(pace, defending, physical);
`;

export async function ensurePlayerDbSchema(): Promise<void> {
  if (initialized) return;
  const statements = SCHEMA_DDL
    .split(/;\s*\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && !s.startsWith("--"));

  const db = sql();
  for (const stmt of statements) {
    await db.query(stmt);
  }
  initialized = true;
}
