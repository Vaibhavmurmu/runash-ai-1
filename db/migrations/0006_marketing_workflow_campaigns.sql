-- Marketing workflow campaign infrastructure
create table if not exists marketing_workflow_templates (
  id uuid primary key default gen_random_uuid(),
  seller_user_id text,
  name text not null,
  description text,
  preset_key text,
  channels jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_workflow_templates_seller_user
  on marketing_workflow_templates (seller_user_id, created_at desc);

create table if not exists marketing_workflow_rules (
  id uuid primary key default gen_random_uuid(),
  seller_user_id text not null,
  name text not null,
  trigger_type text not null,
  template_id uuid references marketing_workflow_templates(id) on delete set null,
  conditions jsonb not null default '{}'::jsonb,
  channels jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_marketing_workflow_rules_trigger_type check (
    trigger_type in ('stream_ended', 'cart_abandoned', 'high_intent_viewer', 'repeat_buyer')
  )
);

create index if not exists idx_marketing_workflow_rules_seller_user
  on marketing_workflow_rules (seller_user_id, is_active, trigger_type);

create table if not exists marketing_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references marketing_workflow_rules(id) on delete cascade,
  seller_user_id text not null,
  trigger_type text not null,
  status text not null default 'running',
  trigger_payload jsonb not null default '{}'::jsonb,
  channel_results jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_marketing_workflow_runs_rule
  on marketing_workflow_runs (rule_id, started_at desc);

create index if not exists idx_marketing_workflow_runs_seller_user
  on marketing_workflow_runs (seller_user_id, started_at desc);
