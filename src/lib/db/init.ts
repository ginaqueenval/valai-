// src/lib/db/init.ts
//
// Idempotent schema initializer. Reads schema.sql and applies it as a
// single batch. Safe to call on every cron run — every statement uses
// IF NOT EXISTS.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./sql";

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const schemaPath = join(process.cwd(), "src/lib/db/schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  // Neon's HTTP driver does not allow multiple statements in one call,
  // so we split on the trailing semicolon of each top-level statement.
  const statements = ddl
    .split(/;\s*\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && !s.startsWith("--"));

  const db = sql();
  for (const stmt of statements) {
    await db.query(stmt);
  }
  initialized = true;
}
