-- AI Agents and Automation Workflows schema for Neon

create table if not exists ai_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('sales','engagement','analytics','moderation')),
  status text not null default 'idle' check (status in ('active','idle','disabled')),
  performance_score numeric not null default 0,
  tasks_completed int not null default 0,
  current_task text,
  enabled boolean not null default true,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'general',
  trigger_type text not null default 'manual' check (trigger_type in ('manual','schedule','event','webhook')),
  trigger_config jsonb not null default '{}',
  workflow_steps jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  enabled boolean not null default false,
  execution_count int not null default 0,
  last_executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references automation_workflows(id) on delete cascade,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  execution_data jsonb not null default '{}',
  result_data jsonb,
  error_message text,
  total_steps int not null default 0,
  completed_steps int not null default 0
);

create table if not exists workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'general',
  template_data jsonb not null default '{}',
  is_public boolean not null default false,
  usage_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages_stream (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references streams(id) on delete cascade,
  user_id uuid,
  username text not null,
  message text not null,
  message_type text not null default 'message' check (message_type in ('message','follow','purchase','tip')),
  amount numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_agents_user_id on ai_agents(user_id);
create index if not exists idx_automation_workflows_user_id on automation_workflows(user_id);
create index if not exists idx_workflow_executions_workflow_id on workflow_executions(workflow_id);
create index if not exists idx_chat_messages_stream_stream_id on chat_messages_stream(stream_id);
