-- Better Auth + auth-session baseline migration for Neon/Postgres.
-- Safe to run multiple times (idempotent guards included).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bootstrap users table for clean environments; production databases already
-- carry this table and will skip creation.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  email TEXT,
  role TEXT,
  sso_organization_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Better Auth user profile fields are hosted on the existing users table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_not_null ON users (email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider_account ON accounts(provider_id, account_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, value)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS auth_session_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  linked_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_identities_user_id ON auth_session_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_identities_linked_user_id ON auth_session_identities(linked_user_id);

CREATE TABLE IF NOT EXISTS auth_session_registry (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'active',
  linked_from_session_id TEXT REFERENCES auth_session_registry(id) ON DELETE SET NULL,
  token_hash TEXT,
  device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rotation_due_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, scope, id)
);

CREATE INDEX IF NOT EXISTS idx_auth_session_registry_user_last_seen ON auth_session_registry(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_session_registry_token_hash ON auth_session_registry(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_session_registry_status_expires ON auth_session_registry(status, expires_at);

CREATE TABLE IF NOT EXISTS auth_one_time_transfer_tokens (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES auth_session_registry(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  source_domain TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_hash ON auth_one_time_transfer_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_session_id ON auth_one_time_transfer_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_expires_at ON auth_one_time_transfer_tokens(expires_at);
