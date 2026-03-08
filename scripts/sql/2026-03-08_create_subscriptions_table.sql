CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_email_normalized_unique
  ON subscriptions (LOWER(BTRIM(email)));

CREATE INDEX IF NOT EXISTS subscriptions_created_at_idx
  ON subscriptions (created_at DESC);
