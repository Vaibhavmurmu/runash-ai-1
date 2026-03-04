CREATE TABLE IF NOT EXISTS phone_otp_challenges (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  otp_last4 TEXT NOT NULL,
  request_ip TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  resend_count INTEGER NOT NULL DEFAULT 0,
  resend_available_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_challenges_phone_purpose
  ON phone_otp_challenges(phone_number, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_otp_challenges_expires_at
  ON phone_otp_challenges(expires_at);

CREATE TABLE IF NOT EXISTS phone_verifications (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  challenge_id BIGINT REFERENCES phone_otp_challenges(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone_number, purpose)
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at
  ON phone_verifications(expires_at);

CREATE TABLE IF NOT EXISTS phone_otp_throttles (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, identifier)
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_throttles_scope_identifier
  ON phone_otp_throttles(scope, identifier);

-- TTL cleanup helpers for periodic jobs.
DELETE FROM phone_otp_challenges WHERE expires_at < NOW();
DELETE FROM phone_verifications WHERE expires_at IS NOT NULL AND expires_at < NOW();
DELETE FROM phone_otp_throttles WHERE blocked_until IS NOT NULL AND blocked_until < NOW() - INTERVAL '1 day';
