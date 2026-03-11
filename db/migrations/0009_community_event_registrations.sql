-- Community events catalog + registrations.
-- Ensures duplicate-safe event registration per user.

CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_events_starts_at
  ON community_events (starts_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS community_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_event_registrations_event
  ON community_event_registrations (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_event_registrations_user
  ON community_event_registrations (user_id, created_at DESC);

INSERT INTO community_events (id, title, description, starts_at, location)
VALUES
  (
    'evt-ai-2026-01',
    'AI for Stream Growth',
    'Workshop exploring AI techniques to boost discoverability and viewer engagement.',
    '2026-01-20T17:00:00Z',
    'Online'
  ),
  (
    'evt-showcase-2026-02',
    'Creator Showcase Night',
    'Monthly showcase where community members present their best work and learnings.',
    '2026-02-05T19:00:00Z',
    'Online'
  )
ON CONFLICT (id) DO NOTHING;
