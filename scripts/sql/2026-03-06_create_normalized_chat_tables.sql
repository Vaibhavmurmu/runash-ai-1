-- Normalized chat persistence tables for sessions, messages, attachments, and tool events.
-- Rollback: scripts/sql/2026-03-06_rollback_normalized_chat_tables.sql

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY DEFAULT ('cs-' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'assistant', 'user', 'tool')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'streaming', 'completed', 'error', 'deleted')),
  model_name TEXT,
  provider_name TEXT,
  provider_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  storage_key TEXT,
  storage_url TEXT,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL CHECK (size >= 0),
  width INTEGER CHECK (width IS NULL OR width >= 0),
  height INTEGER CHECK (height IS NULL OR height >= 0),
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_attachments_storage_ref_check CHECK (
    storage_key IS NOT NULL OR storage_url IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS chat_tool_events (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('start', 'result', 'error')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id
  ON chat_attachments (message_id);

CREATE INDEX IF NOT EXISTS idx_chat_tool_events_message_created
  ON chat_tool_events (message_id, created_at ASC);
