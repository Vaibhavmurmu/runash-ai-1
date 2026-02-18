-- Additive payment-auth linkage table for webhook/customer sync health.
CREATE TABLE IF NOT EXISTS payment_auth_customer_links (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  payment_customer_id TEXT NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  payment_subscription_id TEXT,
  subscription_status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  canceled_at TIMESTAMPTZ,
  last_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_provider, payment_customer_id)
);

ALTER TABLE payment_auth_customer_links
  DROP CONSTRAINT IF EXISTS payment_auth_customer_links_payment_provider_user_id_key;

ALTER TABLE payment_auth_customer_links
  ALTER COLUMN user_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_auth_customer_links_provider_user
ON payment_auth_customer_links(payment_provider, user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_auth_customer_links_subscription
ON payment_auth_customer_links(payment_subscription_id, updated_at DESC);
