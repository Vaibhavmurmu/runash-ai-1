-- Multi-platform streaming persistence primitives
-- Adds multi-stream sessions, per-platform state, and analytics snapshots.

CREATE TABLE IF NOT EXISTS multi_stream_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'ended', 'error')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_viewers INTEGER NOT NULL DEFAULT 0,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_stream_sessions_user_status
  ON multi_stream_sessions (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS multi_stream_platform_states (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES multi_stream_sessions(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'live', 'stopped', 'error')) DEFAULT 'pending',
  is_title_supported BOOLEAN NOT NULL DEFAULT true,
  is_analytics_supported BOOLEAN NOT NULL DEFAULT true,
  last_error_code TEXT,
  last_error_message TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_multi_stream_platform_states_session
  ON multi_stream_platform_states (session_id, state);

CREATE TABLE IF NOT EXISTS platform_analytics_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT REFERENCES multi_stream_sessions(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL,
  viewers INTEGER NOT NULL DEFAULT 0,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  watch_time INTEGER NOT NULL DEFAULT 0,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  stream_health TEXT NOT NULL CHECK (stream_health IN ('excellent', 'good', 'fair', 'poor')) DEFAULT 'good',
  bitrate_actual INTEGER NOT NULL DEFAULT 0,
  fps_actual INTEGER NOT NULL DEFAULT 0,
  dropped_frames INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_platform_range
  ON platform_analytics_snapshots (platform_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_session
  ON platform_analytics_snapshots (session_id, platform_id, timestamp DESC);
