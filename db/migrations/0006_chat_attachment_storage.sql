-- Chat attachment metadata storage.
-- Ordering: apply after 0000-0005 and after base chat session/message tables exist.

CREATE TABLE IF NOT EXISTS runash_chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES runash_chat_sessions(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES runash_chat_session_messages(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  storage_provider TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256_hex TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'failed', 'deleted')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runash_chat_attachments_object_unique
  ON runash_chat_attachments (storage_provider, bucket_name, object_key);

CREATE INDEX IF NOT EXISTS idx_runash_chat_attachments_session_created
  ON runash_chat_attachments (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runash_chat_attachments_message
  ON runash_chat_attachments (message_id);

CREATE INDEX IF NOT EXISTS idx_runash_chat_attachments_user_status
  ON runash_chat_attachments (user_id, upload_status);
