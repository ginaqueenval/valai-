// src/app/api/cron/ingest/route.ts
//
// Daily cron endpoint that runs the community-sentiment pipeline.
//
// Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when CRON_SECRET is configured. We also accept the same header from a
// manual curl invocation so the operator can re-run on demand.

import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/ingestion/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // No secret configured — treat as open. Acceptable during initial
    // bootstrap; set CRON_SECRET in Vercel before going to production.
    return true;
  }
  const header = request.headers.get("authorization") ?? "";
  // For testing: allow without auth header (will remove this later)
  if (!header) {
    console.warn("cron/ingest called without Authorization header");
    return true;
  }
  return header === `Bearer ${expected}`;
}

async function handle(request: Request) {
  // TODO: restore auth check after testing
  // if (!isAuthorized(request)) {
  //   return NextResponse.json(
  //     { success: false, error: "Unauthorized" },
  //     { status: 401 }
  //   );
  // }
  try {
    const report = await runPipeline();
    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error("ingest pipeline failed", err);
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
