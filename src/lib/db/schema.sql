-- src/lib/db/schema.sql
-- Schema for FC community sentiment pipeline.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS sources (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  subreddit TEXT,
  url TEXT,
  title TEXT,
  body TEXT NOT NULL,
  author TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  created_utc TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_fetched_at ON sources(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_subreddit ON sources(subreddit);

CREATE TABLE IF NOT EXISTS classifications (
  source_id BIGINT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  sentiment TEXT NOT NULL,
  bucket TEXT NOT NULL,
  classifier_model TEXT NOT NULL,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classifications_sentiment_check CHECK (sentiment IN ('positive','neutral','negative')),
  CONSTRAINT classifications_bucket_check CHECK (bucket IN ('positive','negative'))
);

CREATE TABLE IF NOT EXISTS entity_mentions (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  bucket TEXT NOT NULL,
  source_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT entity_mentions_bucket_check CHECK (bucket IN ('positive','negative'))
);

CREATE INDEX IF NOT EXISTS idx_mentions_lookup ON entity_mentions(entity_type, normalized_value);
CREATE INDEX IF NOT EXISTS idx_mentions_bucket ON entity_mentions(bucket);

CREATE TABLE IF NOT EXISTS entity_aggregates (
  entity_type TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  display_value TEXT NOT NULL,
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  top_positive_quote TEXT,
  top_negative_quote TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_aggregates_trgm
  ON entity_aggregates USING gin(normalized_value gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_aggregates_type ON entity_aggregates(entity_type);

-- Card profiles extracted from FC card images posted on Reddit.
CREATE TABLE IF NOT EXISTS card_profiles (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  card_type TEXT,
  position TEXT,
  overall_rating INTEGER,
  pac INTEGER,
  sho INTEGER,
  pas INTEGER,
  dri INTEGER,
  def_stat INTEGER,
  phy INTEGER,
  nation TEXT,
  club TEXT,
  league TEXT,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_profiles_name ON card_profiles(normalized_name);
CREATE INDEX IF NOT EXISTS idx_card_profiles_extracted ON card_profiles(extracted_at DESC);
