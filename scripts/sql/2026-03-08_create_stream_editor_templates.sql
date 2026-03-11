CREATE TABLE IF NOT EXISTS stream_editor_templates (
  id UUID PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  workspace_id BIGINT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  html TEXT NOT NULL,
  css TEXT NOT NULL,
  javascript TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_premium BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'public' CHECK (scope IN ('public', 'workspace', 'private', 'premium')),
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_editor_template_metrics (
  template_id UUID PRIMARY KEY REFERENCES stream_editor_templates(id) ON DELETE CASCADE,
  download_count BIGINT NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  usage_count BIGINT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stream_editor_templates_owner_user_id
  ON stream_editor_templates(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_stream_editor_templates_workspace_id
  ON stream_editor_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stream_editor_templates_category
  ON stream_editor_templates(category);
CREATE INDEX IF NOT EXISTS idx_stream_editor_templates_scope
  ON stream_editor_templates(scope);
CREATE INDEX IF NOT EXISTS idx_stream_editor_templates_tags
  ON stream_editor_templates USING GIN(tags);
