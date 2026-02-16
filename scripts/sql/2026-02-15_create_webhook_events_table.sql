-- Durable webhook event persistence for idempotent processing and replay.

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed', 'dead_letter')),
  payload JSONB NOT NULL,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
  ON webhook_events(status, next_retry_at, received_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type
  ON webhook_events(provider, event_type, received_at DESC);
