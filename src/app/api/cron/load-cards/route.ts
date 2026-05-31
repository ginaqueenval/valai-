// src/app/api/cron/load-cards/route.ts
//
// Loads a batch of player card versions into player_cards.
//
// Two ways to supply data:
//   - ?url=<raw JSON url>  → fetch a committed { "cards": [...] } file
//   - POST { "cards": [...] } → send the batch directly in the body
//
// JSON shape (see CardInput): an object with a "cards" array, each entry a
// single card version. Idempotent: re-loading updates rather than duplicates.

import { NextResponse } from "next/server";
import { upsertCards, type CardInput } from "@/lib/cardsDb/cards";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Payload = { cards?: CardInput[] };

function extractCards(payload: unknown): CardInput[] {
  if (Array.isArray(payload)) return payload as CardInput[];
  const p = payload as Payload | null;
  if (p && Array.isArray(p.cards)) return p.cards;
  return [];
}

async function handle(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  let cards: CardInput[] = [];
  try {
    if (url) {
      const res = await fetch(url, {
        headers: { "User-Agent": "valai-fc-community-pipeline/1.0", Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
      cards = extractCards(await res.json());
    } else if (request.method === "POST") {
      cards = extractCards(await request.json());
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Could not read cards: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (cards.length === 0) {
    return NextResponse.json(
      { success: false, error: "No cards found. Provide ?url= or POST { cards: [...] }." },
      { status: 400 }
    );
  }

  try {
    const report = await upsertCards(cards);
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
