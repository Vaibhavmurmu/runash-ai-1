CREATE TABLE IF NOT EXISTS ai_live_chat_sessions (
  id TEXT PRIMARY KEY,
  seller_user_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_live_chat_sessions_seller_status
  ON ai_live_chat_sessions (seller_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_live_chat_session_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_live_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  user_id BIGINT,
  display_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_live_chat_participants_session
  ON ai_live_chat_session_participants (session_id, role, joined_at DESC);

CREATE TABLE IF NOT EXISTS ai_live_chat_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_live_chat_sessions(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  actor_user_id BIGINT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  prohibited_content BOOLEAN NOT NULL DEFAULT FALSE,
  ai_fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_live_chat_events_session_created
  ON ai_live_chat_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_live_chat_events_analytics
  ON ai_live_chat_events (event_type, prohibited_content, ai_fallback_used, created_at DESC);
