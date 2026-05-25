// src/lib/ingestion/twitter.ts
//
// Twitter/X API v2 fetcher using Bearer Token authentication.
// Uses the recent search endpoint to find FC26-related tweets.
//
// Required env: TWITTER_BEARER_TOKEN

export type TwitterItem = {
  source_type: "tweet";
  external_id: string;
  subreddit: string; // re-used field name; stores the search query
  url: string;
  title: null;
  body: string;
  author: string | null;
  score: number; // like_count + retweet_count
  created_utc: Date;
  imageUrl?: string | null;
};

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent";
const MAX_RESULTS_PER_REQUEST = 100;

type TwitterTweet = {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
};

type TwitterUser = {
  id: string;
  username: string;
  name: string;
};

type TwitterMedia = {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
};

type TwitterSearchResponse = {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTwitterSearch(
  query: string,
  maxResults: number = MAX_RESULTS_PER_REQUEST,
  attempt = 0
): Promise<TwitterSearchResponse | null> {
  if (!BEARER_TOKEN) {
    throw new Error("TWITTER_BEARER_TOKEN env var is not set");
  }

  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,public_metrics,author_id,attachments",
    "user.fields": "username,name",
    "media.fields": "url,preview_image_url,type",
    expansions: "author_id,attachments.media_keys",
  });

  const url = `${SEARCH_URL}?${params}`;
  console.log(`[twitter] fetching ${url.slice(0, 100)}... (attempt ${attempt + 1})`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
    },
  });

  console.log(`[twitter] response status: ${response.status}`);

  if (response.status === 429) {
    // Rate limited — Twitter Free tier is very strict.
    if (attempt >= 1) {
      throw new Error(`Twitter rate limit hit after ${attempt + 1} attempts`);
    }
    const resetHeader = response.headers.get("x-rate-limit-reset");
    const waitMs = resetHeader
      ? Math.max(1000, Number(resetHeader) * 1000 - Date.now())
      : 15 * 60 * 1000;
    console.log(`[twitter] rate limited, waiting ${Math.round(waitMs / 1000)}s`);
    await sleep(Math.min(waitMs, 60_000)); // Cap at 60s for cron safety
    return fetchTwitterSearch(query, maxResults, attempt + 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[twitter] error:`, errorText.slice(0, 300));
    throw new Error(`Twitter responded ${response.status}: ${errorText.slice(0, 100)}`);
  }

  return (await response.json()) as TwitterSearchResponse;
}

function extractImageUrl(
  tweet: TwitterTweet,
  mediaMap: Map<string, TwitterMedia>
): string | null {
  const mediaKeys = tweet.attachments?.media_keys ?? [];
  for (const key of mediaKeys) {
    const media = mediaMap.get(key);
    if (media?.type === "photo" && media.url) return media.url;
    if (media?.preview_image_url) return media.preview_image_url;
  }
  return null;
}

export async function searchTweets(
  query: string,
  maxResults: number = MAX_RESULTS_PER_REQUEST
): Promise<TwitterItem[]> {
  const json = await fetchTwitterSearch(query, maxResults);
  if (!json?.data) {
    console.log(`[twitter] no results for "${query}"`);
    return [];
  }

  const userMap = new Map<string, TwitterUser>(
    (json.includes?.users ?? []).map((u) => [u.id, u])
  );
  const mediaMap = new Map<string, TwitterMedia>(
    (json.includes?.media ?? []).map((m) => [m.media_key, m])
  );

  return json.data.map<TwitterItem>((tweet) => {
    const user = userMap.get(tweet.author_id);
    const metrics = tweet.public_metrics;
    const score = (metrics?.like_count ?? 0) + (metrics?.retweet_count ?? 0);

    return {
      source_type: "tweet",
      external_id: `tw_${tweet.id}`,
      subreddit: query,
      url: user
        ? `https://twitter.com/${user.username}/status/${tweet.id}`
        : `https://twitter.com/i/web/status/${tweet.id}`,
      title: null,
      body: tweet.text,
      author: user?.username ?? null,
      score,
      created_utc: new Date(tweet.created_at),
      imageUrl: extractImageUrl(tweet, mediaMap),
    };
  });
}

/**
 * Harvest tweets across multiple FC26-related search queries.
 * Caps total items so we stay within Free tier limits.
 */
export async function harvestTwitter(
  queries: string[],
  maxItemsPerQuery: number
): Promise<{ items: TwitterItem[]; errors: string[] }> {
  console.log(`[harvest-twitter] starting ${queries.length} queries`);
  const collected: TwitterItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      console.log(`[harvest-twitter] query: "${query}"`);
      const tweets = await searchTweets(query, maxItemsPerQuery);
      console.log(`[harvest-twitter] got ${tweets.length} tweets`);
      for (const tweet of tweets) {
        if (seen.has(tweet.external_id)) continue;
        seen.add(tweet.external_id);
        collected.push(tweet);
      }
    } catch (err) {
      const msg = `query "${query}": ${(err as Error).message}`;
      console.error(`[harvest-twitter] ${msg}`);
      errors.push(msg);
    }
    await sleep(2000);
  }

  console.log(
    `[harvest-twitter] done: ${collected.length} unique tweets, ${errors.length} errors`
  );
  return { items: collected, errors };
}
