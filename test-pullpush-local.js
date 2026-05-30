#!/usr/bin/env node

/**
 * Local PullPush.io extraction test.
 *
 * PullPush.io is the alternative to Reddit's official API: a no-auth,
 * datacenter-reachable archive of Reddit comments + submissions. Unlike
 * Reddit's *.json endpoints (which 403 from Vercel), this should work from
 * anywhere — including the server.
 *
 * Usage: node test-pullpush-local.js
 */

const BASE_URL = process.env.PULLPUSH_BASE_URL?.replace(/\/$/, "") || "https://api.pullpush.io";
const LOOKBACK_DAYS = 2;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  console.log(`[fetch] ${url}`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "valai-fc-community-pipeline/1.0",
      Accept: "application/json",
    },
  });
  console.log(`[response] Status: ${response.status}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PullPush ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function testSubreddit(subreddit) {
  console.log(`\n========================================`);
  console.log(`Testing r/${subreddit}`);
  console.log(`========================================`);

  const after = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
  let total = 0;

  try {
    const commentsUrl = `${BASE_URL}/reddit/search/comment/?subreddit=${subreddit}&size=25&sort=desc&sort_type=created_utc&after=${after}`;
    const comments = (await fetchJson(commentsUrl))?.data ?? [];
    console.log(`\n[results] ${comments.length} comments in last ${LOOKBACK_DAYS}d`);
    comments.slice(0, 3).forEach((c, i) => {
      console.log(`  ${i + 1}. (${c.score}) ${c.author}: ${(c.body || "").slice(0, 80).replace(/\n/g, " ")}`);
    });
    total += comments.length;

    await sleep(500);

    const postsUrl = `${BASE_URL}/reddit/search/submission/?subreddit=${subreddit}&size=10&sort=desc&sort_type=created_utc&after=${after}`;
    const posts = (await fetchJson(postsUrl))?.data ?? [];
    console.log(`\n[results] ${posts.length} posts in last ${LOOKBACK_DAYS}d`);
    posts.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. "${(p.title || "").slice(0, 70)}" by ${p.author} (score: ${p.score})`);
    });
    total += posts.length;
  } catch (err) {
    console.error(`\n[failed] r/${subreddit}: ${err.message}`);
  }

  return total;
}

async function main() {
  console.log("val-e PullPush Extraction Test");
  console.log("==============================\n");

  const subreddits = ["EASportsFC", "FIFA", "fut", "FC_26", "fut_evos"];
  let grandTotal = 0;

  for (const sub of subreddits) {
    grandTotal += await testSubreddit(sub);
    await sleep(800);
  }

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`Total items fetched: ${grandTotal}`);

  if (grandTotal > 0) {
    console.log(`\n✅ SUCCESS: PullPush extraction works.`);
    console.log(`This source is reachable from datacenter IPs too, so the daily`);
    console.log(`Vercel cron should now get data where the *.json endpoints 403'd.`);
  } else {
    console.log(`\n❌ No data. PullPush may be having downtime — the pipeline`);
    console.log(`will automatically fall back to Reddit's *.json endpoints.`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
