-- One-time backfill from public.users.bio.userSettings into persistent user_settings tables.
-- Run after creating tables in 2026-02-13_create_user_settings_storage.sql.

WITH legacy AS (
  SELECT
    u.id AS user_id,
    COALESCE((u.bio::jsonb -> 'userSettings'), '{}'::jsonb) AS settings,
    GREATEST(
      1,
      COALESCE(NULLIF((u.bio::jsonb -> 'userSettingsMeta' ->> 'version'), '')::integer, 1)
    ) AS version,
    COALESCE(
      NULLIF((u.bio::jsonb -> 'userSettingsMeta' ->> 'updatedAt'), '')::timestamptz,
      u.updated_at,
      NOW()
    ) AS updated_at,
    COALESCE(
      NULLIF((u.bio::jsonb -> 'userSettingsMeta' ->> 'updatedBy'), '')::bigint,
      u.id
    ) AS updated_by
  FROM public.users u
  WHERE u.bio IS NOT NULL
)
INSERT INTO public.user_settings (user_id, settings, version, updated_at, updated_by, migrated_from_legacy)
SELECT user_id, settings, version, updated_at, updated_by, TRUE
FROM legacy
ON CONFLICT (user_id)
DO UPDATE SET
  settings = EXCLUDED.settings,
  version = EXCLUDED.version,
  updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by,
  migrated_from_legacy = TRUE;

INSERT INTO public.user_settings_audit (user_id, version, updated_at, updated_by, source, settings, notes)
SELECT
  us.user_id,
  us.version,
  us.updated_at,
  us.updated_by,
  'backfill',
  us.settings,
  'initial backfill from users.bio.userSettings'
FROM public.user_settings us
ON CONFLICT DO NOTHING;
