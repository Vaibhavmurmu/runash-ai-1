-- Customer lifecycle analytics and auditability tables
CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  signup_source TEXT NOT NULL DEFAULT 'web',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_checkout_at TIMESTAMPTZ,
  first_plan_id TEXT,
  total_revenue_cents BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (signup_source IN ('web', 'api', 'agent_action'))
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_signup_source ON customer_profiles(signup_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_first_checkout ON customer_profiles(first_checkout_at DESC);

CREATE TABLE IF NOT EXISTS customer_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source IN ('web', 'api', 'agent_action'))
);

CREATE INDEX IF NOT EXISTS idx_customer_events_customer_id ON customer_events(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_events_type_source ON customer_events(event_type, source, occurred_at DESC);

CREATE TABLE IF NOT EXISTS payment_recovery_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  outcome TEXT NOT NULL,
  failure_code TEXT,
  recovered_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source IN ('web', 'api', 'agent_action')),
  CHECK (outcome IN ('recovered', 'failed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_payment_recovery_events_customer ON payment_recovery_events(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_recovery_events_outcome ON payment_recovery_events(outcome, occurred_at DESC);
