CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  source_route TEXT NOT NULL,
  source_campaign TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscriptions_email_ci_unique
  ON email_subscriptions (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_subscriptions_status_created
  ON email_subscriptions (status, created_at DESC);
