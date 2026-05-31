// src/lib/ingestion/pullpush.ts
//
// PullPush.io fetcher — the alternative to Reddit's official API.
//
// WHY THIS EXISTS:
//   Reddit's public *.json endpoints work fine from a residential IP but
//   return 403 from datacenter IPs (Vercel, AWS, etc.). That makes the
//   `reddit.ts` fetcher unreliable in production. PullPush.io is the actively
//   maintained successor to Pushshift: a third-party archive that indexes
//   Reddit comments + submissions and exposes them over a free, no-auth JSON
//   API that is reachable from datacenter IPs.
//
//   Docs: https://pullpush.io/  (endpoints under https://api.pullpush.io/)
//
// It returns the SAME `RedditItem` shape as reddit.ts so the rest of the
// pipeline (classifier, storage, aggregation) does not need to change.

import type { RedditItem } from "./reddit";

const PULLPUSH_BASE_URL =
  process.env.PULLPUSH_BASE_URL?.replace(/\/$/, "") || "https://api.pullpush.io";

// PullPush caps `size` at 100 per request.
const PAGE_SIZE = 100;
// How far back each run looks, in days. PullPush is an ARCHIVE and indexes
// with a lag — its newest available comments can be several days old, so a
// tight 2-day window returned 0. 0 (or negative) means "no time filter, just
// give me the newest indexed items". The pipeline's ON CONFLICT upsert dedupes
// by external_id, so re-seeing the same newest items across days is harmless.
const DEFAULT_LOOKBACK_DAYS = 0;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  console.log(`[pullpush] fetching ${url} (attempt ${attempt + 1})`);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // PullPush doesn't require a special UA, but a descriptive one is
        // polite and helps if they ever need to identify traffic.
        "User-Agent": "valai-fc-community-pipeline/1.0",
        Accept: "application/json",
      },
    });
  } catch (err) {
    // Network-level failure (DNS, timeout). Retry a couple times.
    if (attempt >= 2) throw err;
    await sleep(1500 * Math.pow(2, attempt));
    return fetchJson(url, attempt + 1);
  }

  console.log(`[pullpush] response status: ${response.status} for ${url}`);
  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 3) {
      throw new Error(
        `PullPush responded ${response.status} after ${attempt + 1} attempts`
      );
    }
    await sleep(2000 * Math.pow(2, attempt));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[pullpush] error response:`, errorText.slice(0, 200));
    throw new Error(`PullPush responded ${response.status} for ${url}`);
  }
  return response.json();
}

// Shape of a single object inside PullPush's `data` array. Comments and
// submissions share most fields; the optional ones distinguish them.
type PullPushRecord = {
  id?: string;
  subreddit?: string;
  permalink?: string;
  full_link?: string;
  author?: string;
  score?: number;
  created_utc?: number;
  // submission-only
  title?: string;
  selftext?: string;
  url?: string;
  post_hint?: string;
  over_18?: boolean;
  stickied?: boolean;
  preview?: {
    images?: Array<{ source?: { url?: string } }>;
  };
  // comment-only
  body?: string;
  link_id?: string;
};

type PullPushResponse = { data?: PullPushRecord[] };

function permalinkUrl(rec: PullPushRecord): string {
  if (rec.full_link) return rec.full_link;
  if (rec.permalink) {
    return rec.permalink.startsWith("http")
      ? rec.permalink
      : `https://www.reddit.com${rec.permalink}`;
  }
  return "";
}

function extractImageUrl(rec: PullPushRecord): string | null {
  if (rec.post_hint === "image" && rec.url) return rec.url;
  const previewUrl = rec.preview?.images?.[0]?.source?.url;
  if (previewUrl) return previewUrl.replace(/&amp;/g, "&");
  if (rec.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(rec.url)) return rec.url;
  return null;
}

function buildUrl(
  kind: "comment" | "submission",
  subreddit: string,
  afterEpoch: number | null,
  size: number
): string {
  const params = new URLSearchParams({
    subreddit,
    size: String(size),
    sort: "desc",
    sort_type: "created_utc",
  });
  // Only constrain by time when an `after` is given. Omitting it makes
  // PullPush return its newest indexed items, which is what we want given
  // its indexing lag.
  if (afterEpoch !== null) params.set("after", String(afterEpoch));
  return `${PULLPUSH_BASE_URL}/reddit/search/${kind}/?${params}`;
}

/**
 * Fetch recent comments from a subreddit via PullPush.
 */
export async function fetchSubredditComments(
  subreddit: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
  size: number = PAGE_SIZE
): Promise<RedditItem[]> {
  const afterEpoch =
    lookbackDays > 0
      ? Math.floor(Date.now() / 1000) - lookbackDays * 86400
      : null;
  const url = buildUrl("comment", subreddit, afterEpoch, size);
  const json = (await fetchJson(url)) as PullPushResponse | null;
  const records = json?.data ?? [];

  return records
    .filter((r) => r.id && (r.body ?? "").trim().length > 0)
    .map<RedditItem>((r) => ({
      source_type: "reddit_comment",
      external_id: `t1_${r.id}`,
      subreddit: r.subreddit ?? subreddit,
      url: permalinkUrl(r),
      title: null,
      body: (r.body ?? "").trim(),
      author: r.author ?? null,
      score: r.score ?? 0,
      created_utc: r.created_utc ? new Date(r.created_utc * 1000) : new Date(),
    }))
    // PullPush sometimes returns removed/deleted bodies as placeholders.
    .filter((c) => c.body !== "[removed]" && c.body !== "[deleted]");
}

/**
 * Fetch recent submissions (posts) from a subreddit via PullPush.
 */
export async function fetchSubredditSubmissions(
  subreddit: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
  size: number = PAGE_SIZE
): Promise<RedditItem[]> {
  const afterEpoch =
    lookbackDays > 0
      ? Math.floor(Date.now() / 1000) - lookbackDays * 86400
      : null;
  const url = buildUrl("submission", subreddit, afterEpoch, size);
  const json = (await fetchJson(url)) as PullPushResponse | null;
  const records = json?.data ?? [];

  return records
    .filter((r) => r.id && !r.stickied && !r.over_18)
    .map<RedditItem>((r) => ({
      source_type: "reddit_post",
      external_id: `t3_${r.id}`,
      subreddit: r.subreddit ?? subreddit,
      url: permalinkUrl(r),
      title: r.title ?? null,
      body: (r.selftext ?? "").trim() || (r.title ?? ""),
      author: r.author ?? null,
      score: r.score ?? 0,
      created_utc: r.created_utc ? new Date(r.created_utc * 1000) : new Date(),
      imageUrl: extractImageUrl(r),
    }))
    .filter((p) => p.body.length > 0);
}

/**
 * Harvest a balanced sample of recent posts + comments from a subreddit
 * using PullPush. Mirrors `harvestSubreddit` from reddit.ts so it can be a
 * drop-in primary source. Comments are prioritized — they carry the most
 * actionable community signal — but we cap the total at `maxItems`.
 */
export async function harvestSubredditViaPullPush(
  subreddit: string,
  maxItems: number,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<RedditItem[]> {
  console.log(
    `[pullpush] harvesting r/${subreddit} (max ${maxItems}, lookback ${lookbackDays}d)`
  );
  const collected: RedditItem[] = [];
  const seen = new Set<string>();

  const add = (items: RedditItem[]) => {
    for (const it of items) {
      if (collected.length >= maxItems) break;
      if (seen.has(it.external_id)) continue;
      seen.add(it.external_id);
      collected.push(it);
    }
  };

  // Reserve roughly a third of the budget for posts and the rest for
  // comments, but never fewer than a handful of posts (we need posts to
  // anchor card-image extraction downstream).
  const postBudget = Math.max(20, Math.floor(maxItems / 3));

  try {
    const posts = await fetchSubredditSubmissions(
      subreddit,
      lookbackDays,
      Math.min(PAGE_SIZE, postBudget)
    );
    console.log(`[pullpush] r/${subreddit}: ${posts.length} posts`);
    add(posts);
  } catch (err) {
    console.error(`[pullpush] submissions failed for r/${subreddit}`, err);
  }

  await sleep(500);

  try {
    const comments = await fetchSubredditComments(
      subreddit,
      lookbackDays,
      PAGE_SIZE
    );
    console.log(`[pullpush] r/${subreddit}: ${comments.length} comments`);
    add(comments);
  } catch (err) {
    console.error(`[pullpush] comments failed for r/${subreddit}`, err);
  }

  console.log(`[pullpush] done r/${subreddit}: ${collected.length} items`);
  return collected;
}
