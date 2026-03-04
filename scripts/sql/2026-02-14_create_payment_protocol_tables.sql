-- RunAsh payment protocol orchestration persistence
-- Adds protocol event + consensus tables with immutable timestamps.

CREATE TABLE IF NOT EXISTS payment_protocol_events (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  lock_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_consensus_records (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  lock_id TEXT NOT NULL,
  verifier_set JSONB NOT NULL DEFAULT '[]'::jsonb,
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
  deterministic_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_protocol_events_intent_created
  ON payment_protocol_events(intent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_consensus_records_intent_created
  ON payment_consensus_records(intent_id, created_at DESC);

CREATE OR REPLACE FUNCTION lock_payment_protocol_created_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable for payment protocol records';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_protocol_events_created_at_immutable ON payment_protocol_events;
CREATE TRIGGER trg_payment_protocol_events_created_at_immutable
  BEFORE UPDATE ON payment_protocol_events
  FOR EACH ROW
  EXECUTE FUNCTION lock_payment_protocol_created_at();

DROP TRIGGER IF EXISTS trg_payment_consensus_records_created_at_immutable ON payment_consensus_records;
CREATE TRIGGER trg_payment_consensus_records_created_at_immutable
  BEFORE UPDATE ON payment_consensus_records
  FOR EACH ROW
  EXECUTE FUNCTION lock_payment_protocol_created_at();
