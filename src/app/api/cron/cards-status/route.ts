// src/app/api/cron/cards-status/route.ts
//
// Visit /api/cron/cards-status to see how the cards database is filling up:
// total cards, distinct players, and the list of players that still have ONLY
// a base version (so you know whose special cards to send next).

import { NextResponse } from "next/server";
import { getCardStatus } from "@/lib/cardsDb/cards";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "100");
  try {
    const status = await getCardStatus(Number.isFinite(limit) ? limit : 100);
    return NextResponse.json({ success: true, status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
