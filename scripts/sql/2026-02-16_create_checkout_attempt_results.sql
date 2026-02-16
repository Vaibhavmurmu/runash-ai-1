-- Checkout attempt/result reliability model for RunAsh AI Link instant checkout
CREATE TABLE IF NOT EXISTS checkout_attempt_results (
  id TEXT PRIMARY KEY,
  checkout_session_id TEXT NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  payment_method_ref_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
  attempt_status TEXT NOT NULL,
  attempt_result_code TEXT,
  attempt_result_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_attempt_results_customer_created
  ON checkout_attempt_results(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_attempt_results_session_status
  ON checkout_attempt_results(checkout_session_id, attempt_status);
