-- Adds anonymous identities, multi-mode auth sessions, and one-time transfer token tables.

CREATE TABLE IF NOT EXISTS auth_session_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_user_id TEXT,
  linked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_session_registry (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'active',
  linked_from_session_id TEXT,
  token_hash TEXT,
  device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rotation_due_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_session_registry_user_last_seen
  ON auth_session_registry(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_session_registry_token_hash
  ON auth_session_registry(token_hash)
  WHERE token_hash IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_hash
  ON auth_one_time_transfer_tokens(token_hash);
