// src/app/api/cron/load-tactics/route.ts
//
// Load pro player tactics into pro_tactics.
//   - ?url=<raw JSON url>  → fetch a committed { "tactics": [...] } file
//   - POST { "tactics": [...] } → send directly
// Idempotent by tactic_id (author + name).

import { NextResponse } from "next/server";
import { upsertTactics, type TacticInput } from "@/lib/tacticsDb/tactics";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Payload = { tactics?: TacticInput[] };

function extract(payload: unknown): TacticInput[] {
  if (Array.isArray(payload)) return payload as TacticInput[];
  const p = payload as Payload | null;
  if (p && Array.isArray(p.tactics)) return p.tactics;
  return [];
}

async function handle(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get("url");
  let tactics: TacticInput[] = [];
  try {
    if (url) {
      const res = await fetch(url, {
        headers: { "User-Agent": "valai-fc-community-pipeline/1.0", Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
      tactics = extract(await res.json());
    } else if (request.method === "POST") {
      tactics = extract(await request.json());
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Could not read tactics: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (tactics.length === 0) {
    return NextResponse.json(
      { success: false, error: "No tactics found. Provide ?url= or POST { tactics: [...] }." },
      { status: 400 }
    );
  }

  try {
    const report = await upsertTactics(tactics);
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
