-- Media pipeline domain tables for signed ingest, async transcode orchestration, and CDN delivery controls.

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  project_id uuid references editor_projects(id) on delete set null,
  kind text not null default 'video',
  status text not null default 'initiated',
  upload_session_id uuid not null default gen_random_uuid(),
  source_storage_key text not null,
  source_bucket text,
  source_etag text,
  source_mime_type text not null,
  source_size_bytes bigint not null default 0,
  source_checksum_sha256 text,
  duration_seconds numeric(12,3),
  codec_video text,
  codec_audio text,
  width integer,
  height integer,
  frame_rate numeric(8,3),
  channels integer,
  sample_rate integer,
  metadata jsonb not null default '{}'::jsonb,
  retention_policy_id uuid,
  uploaded_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_retention_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  policy_name text not null,
  scope text not null default 'user',
  keep_source_days integer not null default 30,
  keep_variants_days integer not null default 365,
  auto_archive boolean not null default true,
  auto_purge boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, policy_name)
);

alter table media_assets
  add constraint fk_media_assets_retention_policy
  foreign key (retention_policy_id)
  references media_retention_policies(id)
  on delete set null;

create table if not exists media_transcode_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references media_assets(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  pipeline text not null default 'default',
  status text not null default 'queued',
  requested_outputs jsonb not null default '{}'::jsonb,
  worker_key text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references media_assets(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  transcode_job_id uuid references media_transcode_jobs(id) on delete set null,
  variant_type text not null,
  storage_key text not null,
  cdn_path text not null,
  mime_type text not null,
  container text,
  width integer,
  height integer,
  bitrate_kbps integer,
  frame_rate numeric(8,3),
  duration_seconds numeric(12,3),
  codec_video text,
  codec_audio text,
  channels integer,
  sample_rate integer,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, variant_type)
);

create index if not exists idx_media_assets_owner_created on media_assets(owner_id, created_at desc);
create index if not exists idx_media_assets_project on media_assets(project_id, created_at desc);
create index if not exists idx_media_transcode_jobs_asset_status on media_transcode_jobs(asset_id, status, queued_at desc);
create index if not exists idx_media_variants_asset_type on media_variants(asset_id, variant_type);
create index if not exists idx_media_variants_cdn_path on media_variants(cdn_path);
