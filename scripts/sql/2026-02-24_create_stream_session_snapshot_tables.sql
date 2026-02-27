-- Backward-compatible migration notes:
-- 1) Adds stream session snapshot + follow-up job tables used by Streaming Studio quick actions.
-- 2) Existing stream/payment/auth API contracts are unchanged; this migration is additive.
-- 3) Rollback path: drop stream_highlight_jobs, stream_follow_up_tasks, stream_session_snapshots.

create table if not exists stream_session_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stream_id uuid references streams(id) on delete set null,
  snapshot_status text not null default 'completed' check (snapshot_status in ('draft', 'completed')),
  completed_at timestamptz,
  last_stream_config jsonb not null default '{}'::jsonb,
  scene_layout jsonb not null default '{}'::jsonb,
  key_metrics jsonb not null default '{}'::jsonb,
  unresolved_alerts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stream_session_snapshots_user_completed
  on stream_session_snapshots(user_id, completed_at desc, created_at desc);

create index if not exists idx_stream_session_snapshots_stream
  on stream_session_snapshots(stream_id, created_at desc);

create table if not exists stream_follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stream_id uuid references streams(id) on delete set null,
  source_snapshot_id uuid not null references stream_session_snapshots(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stream_follow_up_tasks_user_created
  on stream_follow_up_tasks(user_id, created_at desc);

create table if not exists stream_highlight_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stream_id uuid references streams(id) on delete set null,
  source_snapshot_id uuid not null references stream_session_snapshots(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stream_highlight_jobs_user_created
  on stream_highlight_jobs(user_id, created_at desc);
