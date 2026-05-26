// src/app/api/admin/players/populate/route.ts
//
// Admin-only endpoint to populate the fc_players table from either:
//   - A community JSON dataset URL (preferred for batch hydration), or
//   - An inline `players` array (useful for ad-hoc top-ups).
//
// Auth: caller must supply `x-admin-token: <ADMIN_TOKEN>` matching the
// ADMIN_TOKEN env var. We DO NOT default this to a known value — if the
// env var is missing, every request is rejected.

import { NextResponse } from "next/server";
import {
  populateFromUrl,
  upsertMany,
  type PlayerDataset,
} from "@/lib/playerDb/populate";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody =
  | { datasetUrl: string }
  | { players: PlayerDataset };

function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length === 0) return false;
  const supplied = request.headers.get("x-admin-token") ?? "";
  // Constant-time compare via length-then-loop to avoid timing leaks.
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  try {
    let written = 0;
    if ("datasetUrl" in body) {
      written = await populateFromUrl(body.datasetUrl);
    } else if ("players" in body && Array.isArray(body.players)) {
      written = await upsertMany(body.players);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either `datasetUrl` (string) or `players` (array).",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, written });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Populate failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
