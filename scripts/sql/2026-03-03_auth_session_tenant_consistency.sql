-- 2026-03-03 auth/session tenant consistency hardening
-- Ensures auth session + trusted-device storage can be tenant-scoped safely
-- while remaining backward-compatible for legacy rows.

CREATE TABLE IF NOT EXISTS auth_trusted_devices (
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  organization_id BIGINT,
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);

ALTER TABLE auth_session_registry
  ADD COLUMN IF NOT EXISTS organization_id BIGINT;

ALTER TABLE auth_trusted_devices
  ADD COLUMN IF NOT EXISTS organization_id BIGINT;

UPDATE auth_session_registry AS r
SET organization_id = u.sso_organization_id
FROM users AS u
WHERE r.user_id = u.id
  AND r.organization_id IS NULL
  AND u.sso_organization_id IS NOT NULL;

UPDATE auth_trusted_devices AS d
SET organization_id = u.sso_organization_id
FROM users AS u
WHERE d.user_id = u.id
  AND d.organization_id IS NULL
  AND u.sso_organization_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'auth_session_identities_user_id_fkey'
      AND table_name = 'auth_session_identities'
  ) THEN
    ALTER TABLE auth_session_identities
      ADD CONSTRAINT auth_session_identities_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'auth_session_identities_linked_user_id_fkey'
      AND table_name = 'auth_session_identities'
  ) THEN
    ALTER TABLE auth_session_identities
      ADD CONSTRAINT auth_session_identities_linked_user_id_fkey
      FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'auth_session_registry_user_id_fkey'
      AND table_name = 'auth_session_registry'
  ) THEN
    ALTER TABLE auth_session_registry
      ADD CONSTRAINT auth_session_registry_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'auth_session_registry_linked_from_session_id_fkey'
      AND table_name = 'auth_session_registry'
  ) THEN
    ALTER TABLE auth_session_registry
      ADD CONSTRAINT auth_session_registry_linked_from_session_id_fkey
      FOREIGN KEY (linked_from_session_id) REFERENCES auth_session_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auth_session_registry_status_expires
  ON auth_session_registry(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_session_registry_org_user_last_seen
  ON auth_session_registry(organization_id, user_id, last_seen_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_trusted_devices_user_last_seen
  ON auth_trusted_devices(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_trusted_devices_org_user_last_seen
  ON auth_trusted_devices(organization_id, user_id, last_seen_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_session_id
  ON auth_one_time_transfer_tokens(session_id);

CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_expires_at
  ON auth_one_time_transfer_tokens(expires_at);
