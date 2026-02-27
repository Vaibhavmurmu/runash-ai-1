CREATE TABLE IF NOT EXISTS mobile_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
  is_subscriber BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_chat_messages_created_at ON mobile_chat_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS mobile_scheduled_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern JSONB,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'General',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  notification_time INTEGER NOT NULL DEFAULT 15,
  template_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_scheduled_streams_scheduled_date ON mobile_scheduled_streams (scheduled_date ASC);
