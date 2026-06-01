// src/app/api/cron/card/route.ts
//
// Inspect exactly what's stored for a player. Visit:
//   /api/cron/card?name=Putellas
// Returns every saved version of that player with full stats + details.

import { NextResponse } from "next/server";
import { getFullCardsForPlayer } from "@/lib/cardsDb/cards";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Pass ?name=<player name>." },
      { status: 400 }
    );
  }
  try {
    const cards = await getFullCardsForPlayer(name);
    return NextResponse.json({ success: true, query: name, count: cards.length, cards });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
