#!/usr/bin/env node

/**
 * Local Reddit extraction test — run this to verify fetching works from your computer.
 * Usage: node test-reddit-local.js
 */

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url, attempt = 0) {
  console.log(`[fetch] ${url} (attempt ${attempt + 1})`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": "https://www.reddit.com/",
        "DNT": "1",
      },
    });

    console.log(`[response] Status: ${response.status} for ${url}`);

    if (response.status === 429 || response.status === 503) {
      if (attempt >= 2) {
        throw new Error(`Reddit responded ${response.status} after ${attempt + 1} attempts`);
      }
      const waitMs = 2000 * Math.pow(2, attempt);
      console.log(`[retry] Waiting ${waitMs}ms before retry...`);
      await sleep(waitMs);
      return fetchJson(url, attempt + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[error] Response body: ${errorText.slice(0, 200)}`);
      throw new Error(`Reddit responded ${response.status} for ${url}`);
    }

    const json = await response.json();
    console.log(`[success] Parsed JSON`);
    return json;
  } catch (err) {
    console.error(`[error] ${err.message}`);
    throw err;
  }
}

async function testSubreddit(subreddit) {
  console.log(`\n========================================`);
  console.log(`Testing r/${subreddit}`);
  console.log(`========================================`);

  try {
    const url = `https://www.reddit.com/r/${subreddit}/top.json?limit=10`;
    const json = await fetchJson(url);

    const children = json?.data?.children ?? [];
    console.log(`\n[results] Got ${children.length} posts from r/${subreddit}`);

    if (children.length > 0) {
      console.log(`\nFirst 3 posts:`);
      children.slice(0, 3).forEach((child, i) => {
        const data = child.data;
        console.log(`  ${i + 1}. "${data.title}" by ${data.author} (score: ${data.score})`);
      });
    }

    return children.length;
  } catch (err) {
    console.error(`\n[failed] r/${subreddit} fetch failed: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log("val-e Reddit Extraction Test");
  console.log("============================\n");

  const subreddits = ["EASportsFC", "FIFA", "fut", "FC_26", "fut_evos"];
  let totalPosts = 0;

  for (const sub of subreddits) {
    const count = await testSubreddit(sub);
    totalPosts += count;
    await sleep(800); // Rate limit between requests
  }

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`Total posts fetched: ${totalPosts}`);
  console.log(`Subreddits tested: ${subreddits.length}`);

  if (totalPosts > 0) {
    console.log(`\n✅ SUCCESS: Reddit data extraction is working!`);
    console.log(`Your computer can reach Reddit. The issue is Vercel's IP being blocked.`);
  } else {
    console.log(`\n❌ FAILED: No data from any subreddit.`);
    console.log(`Check your internet connection and Reddit's status.`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
