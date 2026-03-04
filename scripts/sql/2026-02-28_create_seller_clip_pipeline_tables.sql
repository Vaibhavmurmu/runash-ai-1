CREATE TABLE IF NOT EXISTS public.clip_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id BIGINT NOT NULL,
  recording_id UUID,
  source_upload_key TEXT,
  source_url TEXT,
  title_hint TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'review', 'completed', 'failed', 'published')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  pipeline_stage TEXT NOT NULL DEFAULT 'queued',
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_required BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clip_jobs_seller_created_at ON public.clip_jobs (seller_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_jobs_status ON public.clip_jobs (status);

CREATE TABLE IF NOT EXISTS public.clip_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_job_id UUID NOT NULL REFERENCES public.clip_jobs(id) ON DELETE CASCADE,
  seller_user_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  caption_text TEXT,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  clip_start_seconds INTEGER NOT NULL DEFAULT 0 CHECK (clip_start_seconds >= 0),
  clip_end_seconds INTEGER NOT NULL CHECK (clip_end_seconds > 0),
  score NUMERIC(4, 3) NOT NULL DEFAULT 0,
  preview_url TEXT,
  source_url TEXT,
  storage_key TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'in_review', 'approved', 'auto_approved', 'published', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clip_assets_job_score ON public.clip_assets (clip_job_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_clip_assets_seller_review ON public.clip_assets (seller_user_id, review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clip_publish_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_asset_id UUID NOT NULL REFERENCES public.clip_assets(id) ON DELETE CASCADE,
  seller_user_id BIGINT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed')),
  external_post_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clip_publish_targets_asset_channel ON public.clip_publish_targets (clip_asset_id, channel);
CREATE INDEX IF NOT EXISTS idx_clip_publish_targets_status ON public.clip_publish_targets (status, created_at DESC);
