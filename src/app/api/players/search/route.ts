// src/app/api/players/search/route.ts
//
// Public search endpoint over the fc_players table. Used to translate AI
// profile suggestions into concrete player options.

import { NextResponse } from "next/server";
import { searchByProfile, findPlayerByName } from "@/lib/playerDb/queries";
import type { PlayerProfileQuery } from "@/lib/playerDb/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RequestBody = {
  /** Free-text name to look up. If provided, returns at most one player. */
  name?: string;
  /** Profile query. If provided, returns up to `limit` players. */
  profile?: PlayerProfileQuery;
};

export async function POST(request: Request) {
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
    if (body.name) {
      const player = await findPlayerByName(body.name);
      return NextResponse.json({ success: true, player });
    }
    if (body.profile) {
      const players = await searchByProfile(body.profile);
      return NextResponse.json({ success: true, players });
    }
    return NextResponse.json(
      { success: false, error: "Provide either `name` or `profile`." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
