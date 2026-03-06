-- Add archival/deletion fields and audit logging for runash chat sessions/messages.

ALTER TABLE IF EXISTS runash_chat_sessions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS runash_chat_session_messages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS runash_chat_message_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES runash_chat_sessions(id) ON DELETE CASCADE,
  message_id BIGINT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('edit', 'delete')),
  previous_content TEXT,
  next_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runash_chat_sessions_user_updated_active
  ON runash_chat_sessions (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_runash_chat_messages_session_created_active
  ON runash_chat_session_messages (session_id, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_runash_chat_message_audit_logs_message_created
  ON runash_chat_message_audit_logs (message_id, created_at DESC);
