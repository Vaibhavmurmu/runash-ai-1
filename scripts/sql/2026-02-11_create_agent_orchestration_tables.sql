-- RunAsh agent orchestration schema
-- Normalized entities for sessions, messages, tool calls/results, actions, and feedback.

create table if not exists runash_agent_sessions (
  id text primary key default ('as-' || replace(gen_random_uuid()::text, '-', '')),
  user_id text not null,
  title text not null,
  state text not null default 'active' check (state in ('active', 'waiting_action', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runash_agent_messages (
  id text primary key default ('am-' || replace(gen_random_uuid()::text, '-', '')),
  session_id text not null references runash_agent_sessions(id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  status text not null default 'queued' check (status in ('queued', 'streaming', 'tool-running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runash_agent_tool_calls (
  id text primary key default ('tc-' || replace(gen_random_uuid()::text, '-', '')),
  session_id text not null references runash_agent_sessions(id) on delete cascade,
  message_id text not null references runash_agent_messages(id) on delete cascade,
  tool_name text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists runash_agent_tool_results (
  id text primary key default ('tr-' || replace(gen_random_uuid()::text, '-', '')),
  tool_call_id text not null references runash_agent_tool_calls(id) on delete cascade,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists runash_agent_actions (
  id text primary key default ('aa-' || replace(gen_random_uuid()::text, '-', '')),
  session_id text not null references runash_agent_sessions(id) on delete cascade,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  requires_confirmation boolean not null default false,
  confirmed_by_user boolean not null default false,
  status text not null check (status in ('approved', 'rejected', 'executed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists runash_agent_feedback (
  id text primary key default ('fb-' || replace(gen_random_uuid()::text, '-', '')),
  session_id text not null references runash_agent_sessions(id) on delete cascade,
  message_id text,
  signal text not null check (signal in ('quality', 'safety')),
  score int not null check (score between 1 and 5),
  reason text,
  created_at timestamptz not null default now()
);

-- Indexes for pagination and hot queries.
create index if not exists idx_runash_agent_sessions_user_updated on runash_agent_sessions (user_id, updated_at desc);
create index if not exists idx_runash_agent_messages_session_created on runash_agent_messages (session_id, created_at desc);
create index if not exists idx_runash_agent_tool_calls_session_created on runash_agent_tool_calls (session_id, created_at desc);
create index if not exists idx_runash_agent_actions_session_created on runash_agent_actions (session_id, created_at desc);
create index if not exists idx_runash_agent_feedback_session_created on runash_agent_feedback (session_id, created_at desc);
