ALTER TABLE community_event_registrations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'registered';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_event_registrations_event_id_user_id_key'
      AND conrelid = 'community_event_registrations'::regclass
  ) THEN
    ALTER TABLE community_event_registrations
      ADD CONSTRAINT community_event_registrations_event_id_user_id_key
      UNIQUE (event_id, user_id);
  END IF;
END $$;
