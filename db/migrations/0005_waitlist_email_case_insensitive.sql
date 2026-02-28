-- Ensure waitlist duplicate protection remains case-insensitive at the database layer.
-- This complements API-level normalization and guards against out-of-band inserts.
DROP INDEX IF EXISTS waitlist_entries_email_lower_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_lower_unique_idx
  ON waitlist_entries ((LOWER(email)));
