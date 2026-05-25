// src/lib/ingestion/reddit.ts
//
// Public-JSON Reddit fetcher. No OAuth — we use the unauthenticated
// JSON endpoints, paced and tagged with a unique User-Agent so we don't
// get rate-limited. This is sufficient for once-a-day ingestion of
// public subreddit content.

export type RedditItem = {
  source_type: "reddit_post" | "reddit_comment";
  external_id: string;
  subreddit: string;
  url: string;
  title: string | null;
  body: string;
  author: string | null;
  score: number;
  created_utc: Date;
  imageUrl?: string | null;
};

// Reddit blocks requests with invalid/custom User-Agent.
// Use a standard browser UA that Reddit won't block.
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
console.log(`[reddit] USER_AGENT initialized`);

const POST_FETCH_LIMIT = 50;
const COMMENT_FETCH_LIMIT = 50;
const SUBREDDIT_SORTS: Array<"new" | "top" | "hot"> = ["top", "hot", "new"];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  console.log(`[reddit] fetching ${url} (attempt ${attempt + 1})`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  console.log(`[reddit] response status: ${response.status} for ${url}`);
  if (response.status === 429 || response.status === 503) {
    if (attempt >= 2) {
      throw new Error(`Reddit responded ${response.status} after ${attempt + 1} attempts`);
    }
    await sleep(2000 * Math.pow(2, attempt));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[reddit] error response:`, errorText.slice(0, 200));
    throw new Error(`Reddit responded ${response.status} for ${url}`);
  }
  const json = await response.json();
  console.log(`[reddit] parsed json successfully`);
  return json;
}

type RedditListingChild = {
  kind: string;
  data: {
    id: string;
    name: string;
    subreddit?: string;
    permalink?: string;
    title?: string;
    selftext?: string;
    body?: string;
    author?: string;
    score?: number;
    created_utc?: number;
    stickied?: boolean;
    over_18?: boolean;
    url?: string;
    post_hint?: string;
    preview?: {
      images?: Array<{
        source?: { url?: string };
      }>;
    };
  };
};

type RedditListing = {
  data: {
    children: RedditListingChild[];
  };
};

function permalinkUrl(permalink?: string): string {
  if (!permalink) return "";
  return permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`;
}

function extractImageUrl(data: RedditListingChild["data"]): string | null {
  // Prefer the original image URL when post_hint signals an image post.
  if (data.post_hint === "image" && data.url) return data.url;
  // Reddit serves preview images with HTML-escaped ampersands — unescape them.
  const previewUrl = data.preview?.images?.[0]?.source?.url;
  if (previewUrl) return previewUrl.replace(/&amp;/g, "&");
  // Fallback: direct URL that looks like an image file.
  if (data.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(data.url)) return data.url;
  return null;
}

export async function fetchSubredditPosts(
  subreddit: string,
  sort: "new" | "top" | "hot" = "top",
  limit: number = POST_FETCH_LIMIT,
  timeRange: "hour" | "day" | "week" = "day"
): Promise<RedditItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sort === "top") params.set("t", timeRange);
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?${params}`;
  const json = (await fetchJson(url)) as RedditListing | null;
  const children = json?.data?.children ?? [];

  return children
    .filter((c) => c.kind === "t3" && !c.data.stickied && !c.data.over_18)
    .map<RedditItem>((c) => ({
      source_type: "reddit_post",
      external_id: c.data.name,
      subreddit: c.data.subreddit ?? subreddit,
      url: permalinkUrl(c.data.permalink),
      title: c.data.title ?? null,
      body: (c.data.selftext ?? "").trim() || (c.data.title ?? ""),
      author: c.data.author ?? null,
      score: c.data.score ?? 0,
      created_utc: c.data.created_utc ? new Date(c.data.created_utc * 1000) : new Date(),
      imageUrl: extractImageUrl(c.data),
    }))
    .filter((p) => p.body.length > 0);
}

export async function fetchPostComments(
  permalink: string,
  limit: number = COMMENT_FETCH_LIMIT
): Promise<RedditItem[]> {
  if (!permalink) return [];
  const base = permalink.startsWith("http")
    ? permalink.replace(/\/?$/, "")
    : `https://www.reddit.com${permalink.replace(/\/?$/, "")}`;
  const url = `${base}.json?limit=${limit}&sort=top`;
  const json = (await fetchJson(url)) as RedditListing[] | null;
  // Reddit returns [post, comments] — we want the second listing.
  const commentsListing = Array.isArray(json) ? json[1] : null;
  const children = commentsListing?.data?.children ?? [];

  return children
    .filter((c) => c.kind === "t1" && (c.data.body ?? "").trim().length > 0)
    .map<RedditItem>((c) => ({
      source_type: "reddit_comment",
      external_id: c.data.name,
      subreddit: c.data.subreddit ?? "",
      url: permalinkUrl(c.data.permalink),
      title: null,
      body: (c.data.body ?? "").trim(),
      author: c.data.author ?? null,
      score: c.data.score ?? 0,
      created_utc: c.data.created_utc ? new Date(c.data.created_utc * 1000) : new Date(),
    }));
}

/**
 * Pull a balanced sample of recent + popular content from a subreddit.
 * Caps total items so the cron run stays well under the function timeout.
 */
export async function harvestSubreddit(
  subreddit: string,
  maxItems: number
): Promise<RedditItem[]> {
  console.log(`[harvest] starting r/${subreddit} (max ${maxItems} items)`);
  const collected: RedditItem[] = [];
  const seen = new Set<string>();

  for (const sort of SUBREDDIT_SORTS) {
    if (collected.length >= maxItems) break;
    try {
      console.log(`[harvest] fetching r/${subreddit}/${sort}`);
      const posts = await fetchSubredditPosts(subreddit, sort, POST_FETCH_LIMIT, "day");
      console.log(`[harvest] got ${posts.length} posts from r/${subreddit}/${sort}`);
      for (const post of posts) {
        if (seen.has(post.external_id)) continue;
        seen.add(post.external_id);
        collected.push(post);
        if (collected.length >= maxItems) break;
      }
    } catch (err) {
      console.error(`harvestSubreddit: ${sort} failed for r/${subreddit}`, err);
    }
    await sleep(800);
  }
  console.log(`[harvest] done r/${subreddit}: ${collected.length} unique items`);

  // For the most popular handful of posts, pull a slice of comments too.
  // Comments are where the most actionable community signal lives.
  const topPosts = collected
    .filter((p) => p.source_type === "reddit_post")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  for (const post of topPosts) {
    if (collected.length >= maxItems) break;
    try {
      const comments = await fetchPostComments(post.url, COMMENT_FETCH_LIMIT);
      for (const c of comments) {
        if (seen.has(c.external_id)) continue;
        seen.add(c.external_id);
        collected.push(c);
        if (collected.length >= maxItems) break;
      }
    } catch (err) {
      console.error(`harvestSubreddit: comments failed for ${post.url}`, err);
    }
    await sleep(800);
  }

  return collected;
}
