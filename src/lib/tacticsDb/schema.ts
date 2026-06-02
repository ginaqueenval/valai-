// src/lib/tacticsDb/schema.ts
//
// Schema for PRO PLAYER TACTICS (e.g. FC Pro Open competitors' setups, sourced
// from futwiz/community). Each row is one tactic: formation, build-up style,
// defensive approach, line height, formation strengths/weaknesses, and the
// per-position player roles. The AI advisor uses these as meta reference —
// "what the pros run" — when building a Match Plan.

import { sql } from "@/lib/db/sql";

let initialized = false;

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS pro_tactics (
  tactic_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  game_code TEXT,
  formation TEXT NOT NULL,
  build_up_style TEXT,
  defensive_approach TEXT,
  line_height INTEGER,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  player_roles JSONB,
  source TEXT NOT NULL DEFAULT '',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_tactics_formation ON pro_tactics(formation);
CREATE INDEX IF NOT EXISTS idx_pro_tactics_author ON pro_tactics(author);
`;

export async function ensureTacticsSchema(): Promise<void> {
  if (initialized) return;
  // Strip comment lines within each statement (don't drop a statement just
  // because it starts with a comment).
  const statements = SCHEMA_DDL
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  const db = sql();
  for (const stmt of statements) {
    await db.query(stmt);
  }
  initialized = true;
}
