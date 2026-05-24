// src/lib/db/sql.ts
//
// Thin wrapper around the Neon serverless driver. Vercel's Neon
// integration injects DATABASE_URL (and a handful of POSTGRES_* aliases)
// — we look for the most common ones in order so this works whether the
// project was provisioned via the marketplace or set manually.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

function resolveConnectionString(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL_UNPOOLED,
  ];
  const found = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (!found) {
    throw new Error(
      "Postgres connection string is missing. Set DATABASE_URL (or POSTGRES_URL) in your environment."
    );
  }
  return found;
}

export function sql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  cached = neon(resolveConnectionString());
  return cached;
}
