CREATE TABLE IF NOT EXISTS wallet_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  tokenized_payment_reference TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  billing_address_encrypted TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_cards_single_default_idx
  ON wallet_cards (user_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS wallet_cards_user_created_idx ON wallet_cards (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_link_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  verification_code_hash TEXT NOT NULL,
  verification_metadata_encrypted TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_link_sessions_user_created_idx ON wallet_link_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_activity_logs_user_created_idx ON wallet_activity_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_subscription_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  next_billing_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_subscription_snapshots_user_idx ON wallet_subscription_snapshots (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS wallet_otp_verification_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES wallet_link_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  attempt_code_hash TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_otp_attempts_session_idx ON wallet_otp_verification_attempts (session_id, created_at DESC);
