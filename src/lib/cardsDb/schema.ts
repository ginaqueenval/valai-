// src/lib/cardsDb/schema.ts
//
// Schema for the multi-version player CARDS database.
//
// Unlike fc_players (one canonical card per player, used for squad building),
// player_cards holds EVERY version of a player: Base, TOTW, promos, icons, etc.
// All versions of one player share a `player_key` (their normalized name) so we
// can group them, detect who only has a Base card, and attach Reddit community
// notes to the SPECIFIC version a comment is about.

import { sql } from "@/lib/db/sql";

let initialized = false;

const SCHEMA_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS player_cards (
  card_id TEXT PRIMARY KEY,
  player_key TEXT NOT NULL,
  player_name TEXT NOT NULL,
  card_version TEXT NOT NULL DEFAULT 'Base',
  is_base BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER NOT NULL,
  position TEXT NOT NULL,
  alt_positions TEXT[] NOT NULL DEFAULT '{}',
  pace INTEGER NOT NULL DEFAULT 0,
  shooting INTEGER NOT NULL DEFAULT 0,
  passing INTEGER NOT NULL DEFAULT 0,
  dribbling INTEGER NOT NULL DEFAULT 0,
  defending INTEGER NOT NULL DEFAULT 0,
  physical INTEGER NOT NULL DEFAULT 0,
  skill_moves INTEGER NOT NULL DEFAULT 3,
  weak_foot INTEGER NOT NULL DEFAULT 3,
  preferred_foot TEXT NOT NULL DEFAULT 'Right',
  playstyles TEXT[] NOT NULL DEFAULT '{}',
  playstyles_plus TEXT[] NOT NULL DEFAULT '{}',
  nation TEXT NOT NULL DEFAULT '',
  league TEXT NOT NULL DEFAULT '',
  club TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_player_cards_key ON player_cards(player_key);
CREATE INDEX IF NOT EXISTS idx_player_cards_version ON player_cards(card_version);
CREATE INDEX IF NOT EXISTS idx_player_cards_rating ON player_cards(rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_cards_name_trgm
  ON player_cards USING gin(player_key gin_trgm_ops);

-- Community notes attached to a SPECIFIC card version, sourced from the
-- Reddit ingest pipeline. Many notes per card.
CREATE TABLE IF NOT EXISTS card_community_notes (
  id BIGSERIAL PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES player_cards(card_id) ON DELETE CASCADE,
  source_id BIGINT,
  bucket TEXT NOT NULL DEFAULT 'positive',
  note TEXT NOT NULL,
  source_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT card_notes_bucket_check CHECK (bucket IN ('positive','negative'))
);

CREATE INDEX IF NOT EXISTS idx_card_notes_card ON card_community_notes(card_id);
`;

export async function ensureCardsSchema(): Promise<void> {
  if (initialized) return;
  const statements = SCHEMA_DDL
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const db = sql();
  for (const stmt of statements) {
    await db.query(stmt);
  }
  initialized = true;
}
