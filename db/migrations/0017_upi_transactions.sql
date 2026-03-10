-- 0017_upi_transactions.sql
-- Durable persistence for UPI checkout lifecycle + audit events.

CREATE TABLE IF NOT EXISTS upi_transactions (
  transaction_id TEXT PRIMARY KEY,
  order_id TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'success', 'failed')),
  transaction_reference TEXT NOT NULL,
  provider_reference TEXT,
  provider_status_reference TEXT,
  failure_reason TEXT,
  failure_code TEXT,
  initiation_idempotency_key TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  max_pin_attempts INTEGER NOT NULL,
  execution_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upi_transaction_events (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES upi_transactions(transaction_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  idempotency_key TEXT,
  provider_reference TEXT,
  provider_status_reference TEXT,
  failure_reason TEXT,
  failure_code TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, event_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_upi_transactions_status_created
  ON upi_transactions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upi_transactions_order_id
  ON upi_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_upi_events_txn_created
  ON upi_transaction_events(transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upi_events_type_idem
  ON upi_transaction_events(event_type, idempotency_key);
