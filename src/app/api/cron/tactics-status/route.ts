// src/app/api/cron/tactics-status/route.ts
//
// Visit /api/cron/tactics-status to see how many pro tactics are stored and a
// formation breakdown. Add ?show=1 to also return the full tactic rows.

import { NextResponse } from "next/server";
import { getTacticStatus, getTactics } from "@/lib/tacticsDb/tactics";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const status = await getTacticStatus();
    const body: Record<string, unknown> = { success: true, status };
    if (searchParams.get("show")) {
      body.tactics = await getTactics(searchParams.get("formation") ?? undefined, 50);
    }
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
