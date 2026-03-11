CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  html TEXT NOT NULL,
  css TEXT NOT NULL,
  javascript TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_user_id TEXT,
  workspace_id BIGINT,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'premium', 'owner', 'workspace')),
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_usage_counters (
  template_id TEXT PRIMARY KEY REFERENCES templates(id) ON DELETE CASCADE,
  download_count BIGINT NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  usage_count BIGINT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_access_level ON templates(access_level);
CREATE INDEX IF NOT EXISTS idx_templates_owner_user_id ON templates(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON templates(workspace_id);
