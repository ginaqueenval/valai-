// src/lib/ingestion/pipeline.ts
//
// End-to-end ingest: fetch fresh Reddit content, classify with Gemini,
// upsert into Postgres, then rebuild the entity_aggregates table from
// the latest mentions. Designed to run inside a Vercel cron function.

import { harvestSubreddit, type RedditItem } from "./reddit";
import {
  classifierModelId,
  classifyItems,
  type ClassifierInput,
  type ClassifierResult,
} from "./classifier";
import { ensureSchema } from "../db/init";
import { sql } from "../db/sql";

const TARGET_SUBREDDITS = ["EASportsFC", "FIFA"];
const MAX_ITEMS_PER_SUBREDDIT = 80;
const AGGREGATE_LOOKBACK_DAYS = 14;

export type PipelineReport = {
  fetched: number;
  inserted: number;
  classified: number;
  entities: number;
  aggregates: number;
  errors: string[];
};

async function insertSources(items: RedditItem[]): Promise<Map<string, bigint>> {
  // Map of external_id -> id (so we can attach classifications + entities).
  const db = sql();
  const out = new Map<string, bigint>();
  if (items.length === 0) return out;

  for (const it of items) {
    try {
      const rows = (await db.query(
        `INSERT INTO sources
           (source_type, external_id, subreddit, url, title, body, author, score, created_utc)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (external_id) DO UPDATE
           SET score = EXCLUDED.score,
               fetched_at = NOW()
         RETURNING id`,
        [
          it.source_type,
          it.external_id,
          it.subreddit,
          it.url,
          it.title,
          it.body,
          it.author,
          it.score,
          it.created_utc,
        ]
      )) as Array<{ id: string | number | bigint }>;
      if (rows[0]) {
        out.set(it.external_id, BigInt(rows[0].id));
      }
    } catch (err) {
      console.error("insertSources row failed", it.external_id, err);
    }
  }
  return out;
}

async function storeClassifications(
  externalIdToSourceId: Map<string, bigint>,
  externalIdToItem: Map<string, RedditItem>,
  results: Map<string, ClassifierResult>
): Promise<{ classified: number; entities: number }> {
  const db = sql();
  let classified = 0;
  let entities = 0;

  for (const [externalId, result] of results) {
    const sourceId = externalIdToSourceId.get(externalId);
    const item = externalIdToItem.get(externalId);
    if (sourceId === undefined || !item) continue;

    try {
      await db.query(
        `INSERT INTO classifications (source_id, sentiment, bucket, classifier_model)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id) DO UPDATE
           SET sentiment = EXCLUDED.sentiment,
               bucket = EXCLUDED.bucket,
               classifier_model = EXCLUDED.classifier_model,
               classified_at = NOW()`,
        [sourceId.toString(), result.sentiment, result.bucket, classifierModelId]
      );
      classified += 1;
    } catch (err) {
      console.error("classifications insert failed", externalId, err);
      continue;
    }

    if (result.entities.length === 0) continue;

    try {
      // Refresh entity mentions for this source. Drop the old ones first
      // so re-classification doesn't double-count.
      await db.query(`DELETE FROM entity_mentions WHERE source_id = $1`, [
        sourceId.toString(),
      ]);
      for (const e of result.entities) {
        await db.query(
          `INSERT INTO entity_mentions
             (source_id, entity_type, entity_value, normalized_value, bucket, source_score)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            sourceId.toString(),
            e.type,
            e.value,
            e.normalized_value,
            result.bucket,
            item.score,
          ]
        );
        entities += 1;
      }
    } catch (err) {
      console.error("entity_mentions insert failed", externalId, err);
    }
  }
  return { classified, entities };
}

async function rebuildAggregates(): Promise<number> {
  // Recompute aggregates from the last N days of mentions. We pick the
  // top-scored mention for each bucket as the quote to surface in the UI.
  const db = sql();
  const rows = (await db.query(
    `WITH recent AS (
       SELECT em.entity_type,
              em.entity_value,
              em.normalized_value,
              em.bucket,
              em.source_score,
              s.body
         FROM entity_mentions em
         JOIN sources s ON s.id = em.source_id
        WHERE em.created_at > NOW() - ($1 || ' days')::interval
     ),
     counts AS (
       SELECT entity_type,
              normalized_value,
              MAX(entity_value) AS display_value,
              COUNT(*) FILTER (WHERE bucket = 'positive') AS positive_count,
              COUNT(*) FILTER (WHERE bucket = 'negative') AS negative_count
         FROM recent
        GROUP BY entity_type, normalized_value
     ),
     top_positive AS (
       SELECT DISTINCT ON (entity_type, normalized_value)
              entity_type, normalized_value, body
         FROM recent
        WHERE bucket = 'positive'
        ORDER BY entity_type, normalized_value, source_score DESC
     ),
     top_negative AS (
       SELECT DISTINCT ON (entity_type, normalized_value)
              entity_type, normalized_value, body
         FROM recent
        WHERE bucket = 'negative'
        ORDER BY entity_type, normalized_value, source_score DESC
     )
     SELECT c.entity_type,
            c.normalized_value,
            c.display_value,
            c.positive_count,
            c.negative_count,
            tp.body AS top_positive_quote,
            tn.body AS top_negative_quote
       FROM counts c
       LEFT JOIN top_positive tp
              ON tp.entity_type = c.entity_type
             AND tp.normalized_value = c.normalized_value
       LEFT JOIN top_negative tn
              ON tn.entity_type = c.entity_type
             AND tn.normalized_value = c.normalized_value`,
    [AGGREGATE_LOOKBACK_DAYS]
  )) as Array<{
    entity_type: string;
    normalized_value: string;
    display_value: string;
    positive_count: number | string;
    negative_count: number | string;
    top_positive_quote: string | null;
    top_negative_quote: string | null;
  }>;

  // Wipe and reload — atomic enough for a daily job and dramatically
  // simpler than diffing.
  await db.query(`TRUNCATE entity_aggregates`);

  let inserted = 0;
  for (const r of rows) {
    await db.query(
      `INSERT INTO entity_aggregates
         (entity_type, normalized_value, display_value,
          positive_count, negative_count,
          top_positive_quote, top_negative_quote, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        r.entity_type,
        r.normalized_value,
        r.display_value,
        Number(r.positive_count) || 0,
        Number(r.negative_count) || 0,
        r.top_positive_quote ? r.top_positive_quote.slice(0, 400) : null,
        r.top_negative_quote ? r.top_negative_quote.slice(0, 400) : null,
      ]
    );
    inserted += 1;
  }
  return inserted;
}

export async function runPipeline(): Promise<PipelineReport> {
  const report: PipelineReport = {
    fetched: 0,
    inserted: 0,
    classified: 0,
    entities: 0,
    aggregates: 0,
    errors: [],
  };

  await ensureSchema();

  const allItems: RedditItem[] = [];
  for (const sub of TARGET_SUBREDDITS) {
    try {
      const items = await harvestSubreddit(sub, MAX_ITEMS_PER_SUBREDDIT);
      allItems.push(...items);
    } catch (err) {
      report.errors.push(`harvest r/${sub}: ${(err as Error).message}`);
    }
  }
  report.fetched = allItems.length;
  if (allItems.length === 0) return report;

  const externalIdToItem = new Map(allItems.map((it) => [it.external_id, it]));
  const externalIdToSourceId = await insertSources(allItems);
  report.inserted = externalIdToSourceId.size;

  const classifierInputs: ClassifierInput[] = allItems
    .filter((it) => externalIdToSourceId.has(it.external_id))
    .map((it) => ({
      id: it.external_id,
      text: it.title ? `${it.title}\n\n${it.body}` : it.body,
    }));

  const classifications = await classifyItems(classifierInputs);
  const { classified, entities } = await storeClassifications(
    externalIdToSourceId,
    externalIdToItem,
    classifications
  );
  report.classified = classified;
  report.entities = entities;

  try {
    report.aggregates = await rebuildAggregates();
  } catch (err) {
    report.errors.push(`rebuildAggregates: ${(err as Error).message}`);
  }

  return report;
}
