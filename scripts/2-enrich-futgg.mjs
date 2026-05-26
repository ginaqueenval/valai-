// scripts/2-enrich-futgg.mjs
//
// Stage 2 of the FC player DB hybrid pipeline.
//
// INPUT:  the base JSON produced by stage 1.
// OUTPUT: the same JSON enriched with fields FUT.GG knows better than the
//         community dataset:
//           - cardType    (gold-rare / icon / hero / totw / totw-moments / ...)
//           - playstyles  (the real FC26 PlayStyle names)
//           - playstylesPlus
//           - imageUrl    (if missing or stale in the base)
//
// HOW IT FINDS PLAYERS
//   For each base player we hit FUT.GG's search endpoint with the player's
//   name, then pick the result whose overall rating matches. This avoids
//   accidentally enriching with the wrong card (e.g. a TOTW card when we
//   wanted the gold-rare).
//
// SAFETY
//   - Concurrency is capped (default 4) so we don't hammer FUT.GG.
//   - We wait a small jitter between batches.
//   - On any failure for a player, we LOG and KEEP the base record as-is.
//     A bad enrich never drops a player.
//
// USAGE
//   node scripts/2-enrich-futgg.mjs <base.json> [output.json] \
//        [--concurrency=4] [--limit=500] [--delay=200]
//
//   --limit=N        Only enrich the first N players (highest-rated first,
//                    since stage 1 sorted). Use this to keep cost down or to
//                    iterate. Default: all players in the file.
//   --concurrency=N  Parallel requests in flight. Default 4.
//   --delay=MS       Min ms between request batches. Default 200.
//
// IMPORTANT
//   FUT.GG's endpoint names are not officially documented. The defaults
//   below are a best-effort starting point. If they 404, inspect a real
//   FUT.GG search request in your browser's devtools and update
//   FUTGG_SEARCH_URL / parseSearchResults() below.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    })
);

const inputPath = positional[0];
const outputPath = positional[1] ?? "data/fc26-enriched.json";
const concurrency = flags.concurrency ? Number(flags.concurrency) : 4;
const limit = flags.limit ? Number(flags.limit) : Infinity;
const delayMs = flags.delay ? Number(flags.delay) : 200;

if (!inputPath) {
  console.error(
    "Usage: node scripts/2-enrich-futgg.mjs <base.json> [output.json] [--concurrency=4] [--limit=500] [--delay=200]"
  );
  process.exit(1);
}

const FUTGG_SEARCH_URL = (query) =>
  `https://www.fut.gg/api/fut/players/26/?search=${encodeURIComponent(query)}`;

const USER_AGENT =
  "valai-fc-db-builder/0.1 (https://github.com/ginaqueenval/valai-)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

// FUT.GG's API shape can change. We accept several reasonable shapes:
//   { data: [...] } or { results: [...] } or a raw array.
function parseSearchResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

// Map a single FUT.GG card record into the subset of FcPlayer fields we want
// to overlay. Field names are FUT.GG-conventional; adjust if you see the
// real payload uses different keys.
function adoptCardFields(card) {
  const overlay = {};
  if (card.cardType || card.rarity || card.version) {
    overlay.cardType = String(card.cardType || card.rarity || card.version)
      .toLowerCase()
      .replace(/\s+/g, "-");
  }
  if (Array.isArray(card.playstyles) && card.playstyles.length > 0) {
    overlay.playstyles = card.playstyles.map(String);
  }
  if (
    Array.isArray(card.playstylesPlus) &&
    card.playstylesPlus.length > 0
  ) {
    overlay.playstylesPlus = card.playstylesPlus.map(String);
  }
  if (card.imageUrl || card.image || card.cardImage) {
    overlay.imageUrl = String(card.imageUrl || card.image || card.cardImage);
  }
  return overlay;
}

function pickCard(results, baseName, baseOverall) {
  // Prefer exact overall match. If none, the highest-rated card under +2
  // (so we don't accidentally pick a Promo).
  const exact = results.find(
    (r) => Number(r.overall ?? r.rating) === baseOverall
  );
  if (exact) return exact;
  const close = results
    .filter((r) => {
      const ovr = Number(r.overall ?? r.rating);
      return Number.isFinite(ovr) && ovr <= baseOverall + 2;
    })
    .sort((a, b) => Number(b.overall ?? b.rating) - Number(a.overall ?? a.rating));
  return close[0];
}

async function enrichOne(player) {
  try {
    const payload = await fetchJson(FUTGG_SEARCH_URL(player.name));
    const results = parseSearchResults(payload);
    if (results.length === 0) return { player, status: "no-results" };
    const card = pickCard(results, player.name, player.overall);
    if (!card) return { player, status: "no-card-match" };
    const overlay = adoptCardFields(card);
    return { player: { ...player, ...overlay }, status: "enriched" };
  } catch (err) {
    return { player, status: `error:${err.message}` };
  }
}

async function runInBatches(items, batchSize, worker, betweenMs) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((item) => worker(item)));
    out.push(...results);
    if (i + batchSize < items.length && betweenMs > 0) {
      // Small jitter so we don't look mechanical.
      await sleep(betweenMs + Math.floor(Math.random() * betweenMs));
    }
  }
  return out;
}

// ---- main -----------------------------------------------------------------

const raw = fs.readFileSync(inputPath, "utf8");
const base = JSON.parse(raw);
if (!Array.isArray(base)) {
  console.error("Input JSON must be an array of FcPlayer records (stage 1 output).");
  process.exit(1);
}

const slice = base.slice(0, Math.min(base.length, limit));
console.log(
  `Enriching ${slice.length} player(s) of ${base.length}. ` +
    `concurrency=${concurrency} delay=${delayMs}ms`
);

const enriched = await runInBatches(slice, concurrency, enrichOne, delayMs);

const stats = enriched.reduce((acc, r) => {
  acc[r.status.split(":")[0]] = (acc[r.status.split(":")[0]] ?? 0) + 1;
  return acc;
}, {});

// Stitch enriched + untouched tail.
const enrichedPlayers = enriched.map((r) => r.player);
const remainder = base.slice(slice.length);
const out = [...enrichedPlayers, ...remainder];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf8");

console.log(`Wrote ${out.length} players to ${outputPath}`);
console.log("Stats:", stats);
