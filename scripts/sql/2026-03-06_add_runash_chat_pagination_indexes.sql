-- Pagination support indexes for runash chat session + message APIs.

CREATE INDEX IF NOT EXISTS idx_runash_chat_sessions_user_updated_id
  ON runash_chat_sessions (user_id, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_runash_chat_sessions_user_title_search
  ON runash_chat_sessions (user_id, title)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_runash_chat_messages_session_created_id
  ON runash_chat_session_messages (session_id, created_at ASC, id ASC)
  WHERE deleted_at IS NULL;
