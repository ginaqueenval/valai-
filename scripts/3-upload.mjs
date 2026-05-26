// scripts/3-upload.mjs
//
// Stage 3 of the FC player DB hybrid pipeline.
//
// Takes the enriched JSON (from stage 2, or stage 1 if you skipped enrich)
// and POSTs it to /api/admin/players/populate in batches.
//
// USAGE
//   ADMIN_TOKEN=xxx \
//   node scripts/3-upload.mjs <enriched.json> \
//        --site=https://your-site.vercel.app \
//        [--batch=200]
//
//   --site     The base URL of your deployed site (no trailing slash).
//              Use http://localhost:3000 for local dev.
//   --batch    Players per request. Default 200. Larger = fewer round trips
//              but more memory on the serverless function side.
//
// EXIT CODES
//   0 on full success, 1 on partial failure (errors logged per batch).

import fs from "node:fs";

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
const site = flags.site;
const batchSize = flags.batch ? Number(flags.batch) : 200;
const adminToken = process.env.ADMIN_TOKEN;

if (!inputPath || !site || !adminToken) {
  console.error(
    "Usage:\n" +
      "  ADMIN_TOKEN=xxx node scripts/3-upload.mjs <enriched.json> --site=https://your-site.vercel.app [--batch=200]\n\n" +
      "ADMIN_TOKEN env var is required. It must match the ADMIN_TOKEN set on the server."
  );
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const players = JSON.parse(raw);
if (!Array.isArray(players)) {
  console.error("Input JSON must be an array of FcPlayer records.");
  process.exit(1);
}

const endpoint = `${site.replace(/\/$/, "")}/api/admin/players/populate`;
let totalWritten = 0;
let totalFailed = 0;

console.log(
  `Uploading ${players.length} player(s) to ${endpoint} in batches of ${batchSize}...`
);

for (let i = 0; i < players.length; i += batchSize) {
  const batch = players.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  const totalBatches = Math.ceil(players.length / batchSize);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ players: batch }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      console.error(
        `Batch ${batchNum}/${totalBatches} FAILED (HTTP ${res.status}):`,
        data?.error ?? "no error body"
      );
      totalFailed += batch.length;
      continue;
    }
    totalWritten += Number(data.written ?? batch.length);
    console.log(
      `Batch ${batchNum}/${totalBatches} ok (${data.written} written, ` +
        `${totalWritten}/${players.length} total).`
    );
  } catch (err) {
    console.error(
      `Batch ${batchNum}/${totalBatches} threw:`,
      err instanceof Error ? err.message : err
    );
    totalFailed += batch.length;
  }
}

console.log(
  `\nDone. Written: ${totalWritten}. Failed: ${totalFailed}.`
);
process.exit(totalFailed > 0 ? 1 : 0);
