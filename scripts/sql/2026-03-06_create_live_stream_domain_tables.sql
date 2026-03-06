-- Backward-compatible migration notes:
-- 1) Adds dedicated live stream lifecycle tables and append-only events.
-- 2) Existing streaming, payment, and auth contracts remain unchanged (additive schema only).
-- 3) Rollback path: drop live_stream_command_idempotency, live_stream_events, live_stream_endpoints, live_stream_sessions.

create table if not exists live_stream_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id bigint not null,
  workspace_id text,
  title text,
  status text not null check (status in ('draft', 'starting', 'live', 'stopping', 'ended', 'failed')),
  playback_urls jsonb not null default '[]'::jsonb,
  dvr_enabled boolean not null default true,
  latency_profile text not null default 'normal' check (latency_profile in ('normal', 'low', 'ultra_low')),
  failure_reason text,
  starting_at timestamptz,
  live_at timestamptz,
  stopping_at timestamptz,
  ended_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_stream_sessions_owner_created
  on live_stream_sessions (owner_user_id, created_at desc);

create index if not exists idx_live_stream_sessions_workspace_created
  on live_stream_sessions (workspace_id, created_at desc);

create index if not exists idx_live_stream_sessions_status_created
  on live_stream_sessions (status, created_at desc);

create table if not exists live_stream_endpoints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_stream_sessions(id) on delete cascade,
  provider text not null,
  ingest_url text not null,
  ingest_token_masked text not null,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_stream_endpoints_session_created
  on live_stream_endpoints (session_id, created_at desc);

create table if not exists live_stream_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_stream_sessions(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text not null check (to_status in ('draft', 'starting', 'live', 'stopping', 'ended', 'failed')),
  actor_user_id bigint,
  idempotency_key text,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_live_stream_events_session_occurred
  on live_stream_events (session_id, occurred_at asc);

create table if not exists live_stream_command_idempotency (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_stream_sessions(id) on delete cascade,
  operation text not null check (operation in ('start', 'stop')),
  idempotency_key text not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, operation, idempotency_key)
);
