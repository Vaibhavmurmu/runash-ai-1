CREATE TABLE IF NOT EXISTS waitlist_entries (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  use_case TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx ON waitlist_entries (created_at DESC);
