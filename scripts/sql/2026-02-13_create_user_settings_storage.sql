-- Persistent user settings storage for transition away from users.bio.userSettings.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT NOT NULL REFERENCES public.users(id),
  migrated_from_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_setting_attachments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attachment_slot TEXT NOT NULL CHECK (attachment_slot IN ('avatar', 'banner', 'feedback')),
  attachment_order INTEGER NOT NULL DEFAULT 0 CHECK (attachment_order >= 0),
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL CHECK (size >= 0),
  uploaded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_setting_attachments_unique_slot_order
  ON public.user_setting_attachments (user_id, attachment_slot, attachment_order);

CREATE TABLE IF NOT EXISTS public.user_settings_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT NOT NULL REFERENCES public.users(id),
  source TEXT NOT NULL DEFAULT 'api',
  settings JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_audit_user_created
  ON public.user_settings_audit (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_audit_unique_source_version
  ON public.user_settings_audit (user_id, version, source);
