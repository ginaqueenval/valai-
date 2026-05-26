# FC Player DB pipeline

Three-stage hybrid pipeline for populating the `fc_players` table.

```
community JSON ─► stage 1 ─► base.json ─► stage 2 ─► enriched.json ─► stage 3 ─► /api/admin/players/populate
                  (adapt)                 (FUT.GG)                    (upload)
```

All scripts are plain ESM, no transpile step. Run with Node 18+.

## Stage 1 — Build base from a community dataset

Pick a community FC26 dataset and clone it locally. The main candidate:

- https://github.com/ismailoksuz/EAFC26-DataHub (18,000+ players, JSON files
  in `output/json/`).

```bash
node scripts/1-build-base.mjs path/to/community-players.json data/fc26-base.json --top=80
```

- `--top=N` keeps only players with `overall >= N`. Recommended `80` for a
  reasonable cut, `84` for the meta slice.

The script normalizes field names through `FIELD_ALIASES`, so most
Kaggle-style and FUT-DB-style shapes work without code changes. If your
dataset uses a different schema, add aliases at the top of the script.

## Stage 2 — Enrich top cards from FUT.GG

```bash
node scripts/2-enrich-futgg.mjs data/fc26-base.json data/fc26-enriched.json \
  --limit=500 --concurrency=4 --delay=200
```

- `--limit=N` — only enrich the first N players (highest-rated first because
  stage 1 sorted). Start with a small `--limit=100` to verify the FUT.GG
  endpoint works before crawling thousands.
- `--concurrency=N` — parallel requests. Keep ≤ 4 to be polite.
- `--delay=MS` — wait between batches.

This stage **adds** `cardType`, real `playstyles` / `playstylesPlus`, and a
clean `imageUrl`. Players whose enrichment fails keep their stage-1 fields —
nothing is dropped.

**Heads up:** FUT.GG's API endpoints aren't officially documented. If the
defaults 404 or return a different shape, edit `FUTGG_SEARCH_URL` and
`parseSearchResults()` / `adoptCardFields()` in stage 2. Watch a real FUT.GG
search request in your browser devtools to get the current shape.

## Stage 3 — Upload to the populate endpoint

```bash
ADMIN_TOKEN=xxx node scripts/3-upload.mjs data/fc26-enriched.json \
  --site=https://your-site.vercel.app \
  --batch=200
```

- `ADMIN_TOKEN` must match the `ADMIN_TOKEN` env var set on the server. The
  populate endpoint rejects requests where the header doesn't match exactly.
- `--site` is the deployed base URL (or `http://localhost:3000`).
- `--batch=N` players per request. Default 200.

Output tells you `written` vs `failed` per batch. Exit code is non-zero on
any failure.

## Re-run cadence

- **Stage 1** once a week (whenever the community dataset publishes a new
  snapshot).
- **Stage 2** is the slow part. Run it for new cards only (filter the base
  by `updated_at` or simply `--limit` to the top N you care about).
- **Stage 3** is cheap; re-run whenever stages 1 or 2 produce a new file.
  The endpoint upserts, so running on the same file twice is a no-op.
