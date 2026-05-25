#!/usr/bin/env node

/**
 * Twitter API extraction test.
 * Usage: TWITTER_BEARER_TOKEN=your_token node test-twitter-local.js
 */

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.error("❌ TWITTER_BEARER_TOKEN env var is not set!");
  console.error("\nUsage:");
  console.error("  TWITTER_BEARER_TOKEN=your_token node test-twitter-local.js");
  console.error("\nOr add to .env.local and source it first.");
  process.exit(1);
}

async function searchTweets(query, maxResults = 10) {
  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics,author_id",
    "user.fields": "username,name",
    expansions: "author_id",
  });

  const url = `https://api.twitter.com/2/tweets/search/recent?${params}`;
  console.log(`[fetch] ${url.slice(0, 80)}...`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });

  console.log(`[response] Status: ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error(`[error] ${text.slice(0, 300)}`);
    throw new Error(`Twitter API responded ${response.status}`);
  }

  return response.json();
}

async function testQuery(query) {
  console.log(`\n========================================`);
  console.log(`Testing query: "${query}"`);
  console.log(`========================================`);

  try {
    const result = await searchTweets(query, 10);
    const tweets = result.data ?? [];
    const users = new Map((result.includes?.users ?? []).map((u) => [u.id, u]));

    console.log(`\n[results] Got ${tweets.length} tweets`);

    if (tweets.length > 0) {
      console.log(`\nFirst 3 tweets:`);
      tweets.slice(0, 3).forEach((tweet, i) => {
        const user = users.get(tweet.author_id);
        const likes = tweet.public_metrics?.like_count ?? 0;
        console.log(
          `  ${i + 1}. @${user?.username ?? "?"} (${likes} likes): "${tweet.text.slice(0, 100)}..."`
        );
      });
    }

    return tweets.length;
  } catch (err) {
    console.error(`\n[failed] Query "${query}" failed: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log("val-e Twitter Extraction Test");
  console.log("=============================\n");

  const queries = [
    "FC26",
    "EAFC26 OR EASportsFC",
    "FUT26 OR #FUT26",
  ];

  let total = 0;
  for (const query of queries) {
    total += await testQuery(query);
    // Twitter Free tier is strict — wait between requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total tweets fetched: ${total}`);

  if (total > 0) {
    console.log(`\n✅ SUCCESS: Twitter API is working!`);
  } else {
    console.log(`\n❌ FAILED: No tweets. Check token and rate limits.`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
