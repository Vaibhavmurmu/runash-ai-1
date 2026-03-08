-- Editor domain persistence (projects, timelines, tracks, segments, assets, render jobs)
create table if not exists editor_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  active_timeline_id uuid,
  version bigint not null default 0,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists editor_timelines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  frame_rate numeric(6,2) not null default 30,
  duration_seconds numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table editor_projects
  add constraint fk_editor_projects_active_timeline
  foreign key (active_timeline_id)
  references editor_timelines(id)
  on delete set null;

create table if not exists editor_tracks (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references editor_timelines(id) on delete cascade,
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  label text not null,
  order_index integer not null default 0,
  track_type text not null default 'video',
  metadata jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists editor_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  source text not null default 'upload',
  upload_file_id text,
  storage_key text not null,
  access_url text,
  mime_type text not null,
  size_bytes bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists editor_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  timeline_id uuid not null references editor_timelines(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  track_id uuid not null references editor_tracks(id) on delete cascade,
  asset_id uuid references editor_assets(id) on delete set null,
  label text not null,
  segment_type text not null default 'clip',
  start_seconds numeric(10,3) not null,
  end_seconds numeric(10,3) not null,
  metadata jsonb not null default '{}'::jsonb,
  lock_owner_user_id text,
  lock_acquired_at timestamptz,
  lock_updated_at timestamptz,
  lock_expires_at timestamptz,
  version bigint not null default 0,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists editor_render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  requested_by uuid not null references users(id) on delete cascade,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  output_asset_id uuid references editor_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_editor_projects_owner on editor_projects(owner_id);
create index if not exists idx_editor_timelines_project on editor_timelines(project_id);
create index if not exists idx_editor_tracks_timeline on editor_tracks(timeline_id);
create index if not exists idx_editor_segments_timeline on editor_segments(timeline_id);
create index if not exists idx_editor_segments_project on editor_segments(project_id);
create index if not exists idx_editor_assets_project on editor_assets(project_id);
create index if not exists idx_editor_render_jobs_project on editor_render_jobs(project_id);
