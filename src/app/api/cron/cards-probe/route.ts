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

  // The only reachable FUT.GG surface is the HTML page (200), which is a
  // TanStack JS app that loads its data from some backend URL. Fetch that page
  // and mine it for the real data endpoints: absolute API URLs, the page's
  // embedded JSON payload keys, and any player-item id references. That tells
  // us where the cards actually come from without more blind guessing.
  let pageStatus: number | undefined;
  let apiUrls: string[] = [];
  let dataUrls: string[] = [];
  let snippet = "";
  let error: string | undefined;

  try {
    const res = await fetch(`https://www.fut.gg/players/?search=${q}`, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    pageStatus = res.status;
    const html = await res.text();

    // Any absolute URL that looks like an API/data/cdn endpoint.
    const urlRe = /https?:\/\/[^\s"'<>\\)]+/g;
    const all = Array.from(new Set(html.match(urlRe) ?? []));
    apiUrls = all
      .filter((u) => /(\/api\/|api\.fut\.gg|game-assets|player-item|\/players?\/)/i.test(u))
      .slice(0, 40);
    // Relative paths referenced for data fetching (TanStack loaders, etc.).
    const relRe = /["'](\/(?:api|_build|fut|game-assets)[^"']{3,120})["']/g;
    const rels = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = relRe.exec(html)) !== null) rels.add(m[1]);
    dataUrls = Array.from(rels).slice(0, 40);

    // Find the chunk around the player's name so we can see how cards are
    // represented inline (if the page server-rendered any of them).
    const idx = html.toLowerCase().indexOf(name.toLowerCase());
    snippet = idx >= 0 ? html.slice(idx - 80, idx + 320) : html.slice(0, 400);
  } catch (err) {
    error = (err as Error).message;
  }

  return NextResponse.json({
    probedAt: new Date().toISOString(),
    name,
    pageStatus,
    apiUrls,
    dataUrls,
    snippet,
    error,
  });
}

// Legacy multi-path probe kept for reference under ?mode=paths.
export async function POST(request: Request) {
  const name = new URL(request.url).searchParams.get("name") || "Salah";
  const q = encodeURIComponent(name);
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
