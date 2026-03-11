DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'editor_projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE editor_projects
      ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_editor_projects_user_version
      ON editor_projects(user_id, version);
  END IF;
END;
$$;
