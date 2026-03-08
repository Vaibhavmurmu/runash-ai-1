ALTER TABLE community_event_registrations
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'community_api';
