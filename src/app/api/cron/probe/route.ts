// src/app/api/cron/probe/route.ts
//
// Raw connectivity probe. Hits PullPush and Reddit directly from the server
// and returns the raw HTTP status + a body snippet for each, so we can see
// EXACTLY what the datacenter IP gets (200 / 403 / 429 / empty) without the
// pipeline swallowing the result.
//
// Visit /api/cron/probe to run it. Read-only, no DB writes.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type ProbeResult = {
  label: string;
  url: string;
  status?: number;
  ok?: boolean;
  bodyCount?: number | null;
  bodySnippet?: string;
  error?: string;
};

async function probe(
  label: string,
  url: string,
  headers: Record<string, string>
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let bodyCount: number | null = null;
    try {
      const json = JSON.parse(text);
      // PullPush => { data: [...] } ; Reddit listing => { data: { children: [...] } }
      if (Array.isArray(json?.data)) bodyCount = json.data.length;
      else if (Array.isArray(json?.data?.children))
        bodyCount = json.data.children.length;
    } catch {
      // not JSON — leave bodyCount null
    }
    return {
      label,
      url,
      status: res.status,
      ok: res.ok,
      bodyCount,
      bodySnippet: text.slice(0, 300),
    };
  } catch (err) {
    return { label, url, error: (err as Error).message };
  }
}

export async function GET() {
  const after = Math.floor(Date.now() / 1000) - 7 * 86400;
  const ppBase =
    process.env.PULLPUSH_BASE_URL?.replace(/\/$/, "") || "https://api.pullpush.io";

  const results = await Promise.all([
    probe(
      "pullpush_comments",
      `${ppBase}/reddit/search/comment/?subreddit=FIFA&size=5&sort=desc&sort_type=created_utc&after=${after}`,
      { "User-Agent": "valai-fc-community-pipeline/1.0", Accept: "application/json" }
    ),
    probe(
      "pullpush_root",
      `${ppBase}/reddit/search/comment/?subreddit=FIFA&size=5`,
      { "User-Agent": "valai-fc-community-pipeline/1.0", Accept: "application/json" }
    ),
    probe("reddit_json", "https://www.reddit.com/r/FIFA/top.json?limit=5&t=day", {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json",
    }),
  ]);

  return NextResponse.json({ probedAt: new Date().toISOString(), results });
}
