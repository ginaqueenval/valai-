// src/app/api/cron/cards-probe/route.ts
//
// Raw probe for Ultimate Team CARD sources. A player like Salah has many FUT
// cards (gold, TOTW, special promos). We want to pull all versions per player,
// but the candidate sites (FUT.GG / Futbin / Futwiz) are undocumented and may
// block datacenter IPs (like Reddit did). This endpoint hits each one for a
// sample player and returns the raw HTTP status + a body snippet, so we can
// see what's actually reachable from Vercel and what shape the data is, BEFORE
// committing to a scraper.
//
// Visit /api/cron/cards-probe?name=Salah  (read-only, no DB writes).

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type Probe = {
  label: string;
  url: string;
  status?: number;
  ok?: boolean;
  contentType?: string;
  looksJson?: boolean;
  itemCountGuess?: number | null;
  bodySnippet?: string;
  error?: string;
};

async function probe(label: string, url: string): Promise<Probe> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const text = await res.text();
    let itemCountGuess: number | null = null;
    let looksJson = false;
    try {
      const json = JSON.parse(text);
      looksJson = true;
      if (Array.isArray(json)) itemCountGuess = json.length;
      else if (Array.isArray(json?.data)) itemCountGuess = json.data.length;
      else if (Array.isArray(json?.results)) itemCountGuess = json.results.length;
      else if (Array.isArray(json?.players)) itemCountGuess = json.players.length;
    } catch {
      /* not JSON (probably HTML or a Cloudflare challenge) */
    }
    return {
      label,
      url,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") ?? undefined,
      looksJson,
      itemCountGuess,
      bodySnippet: text.slice(0, 350),
    };
  } catch (err) {
    return { label, url, error: (err as Error).message };
  }
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name") || "Salah";
  const q = encodeURIComponent(name);

  // FUT.GG is reachable (it returned its own 404 page, not a Cloudflare block),
  // so the only question is the correct API path. Futwiz/Futbin are Cloudflare-
  // blocked (403 "Just a moment"), so we focus on discovering FUT.GG's real
  // endpoints by trying several plausible shapes at once.
  const results = await Promise.all([
    probe("futgg_v1_players", `https://www.fut.gg/api/fut/players/?search=${q}`),
    probe("futgg_v1_search", `https://www.fut.gg/api/fut/search/?query=${q}`),
    probe("futgg_player_items", `https://www.fut.gg/api/fut/player-item/?search=${q}`),
    probe("futgg_players_26", `https://www.fut.gg/api/fut/26/players/?search=${q}`),
    probe("futgg_search_q", `https://www.fut.gg/api/fut/players/?q=${q}`),
    probe("futgg_autocomplete", `https://www.fut.gg/api/fut/autocomplete/?query=${q}`),
    probe("futgg_players_search", `https://www.fut.gg/api/players/search/?name=${q}`),
    probe("futgg_html_players", `https://www.fut.gg/players/?search=${q}`),
  ]);

  return NextResponse.json({ probedAt: new Date().toISOString(), name, results });
}
