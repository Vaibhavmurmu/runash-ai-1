-- Editor render orchestration reliability upgrade
alter table editor_render_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists next_retry_at timestamptz,
  add column if not exists cancellation_token text,
  add column if not exists canceled_at timestamptz,
  add column if not exists provider_trace jsonb not null default '{}'::jsonb,
  add column if not exists provider_output jsonb not null default '{}'::jsonb,
  add column if not exists output_publication jsonb not null default '{}'::jsonb,
  add column if not exists last_error_code text;

create index if not exists idx_editor_render_jobs_status_retry on editor_render_jobs(status, next_retry_at);

create table if not exists editor_render_job_timeline (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references editor_render_jobs(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  from_status text,
  to_status text not null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_editor_render_job_timeline_job on editor_render_job_timeline(job_id, created_at);

create table if not exists editor_render_job_dead_letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references editor_render_jobs(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references editor_projects(id) on delete cascade,
  failure_code text,
  failure_message text,
  snapshot jsonb not null default '{}'::jsonb,
  replay_count integer not null default 0,
  last_replayed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists idx_editor_render_dead_letters_owner on editor_render_job_dead_letters(owner_id, created_at);
