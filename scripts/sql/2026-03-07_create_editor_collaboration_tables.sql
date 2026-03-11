create table if not exists editor_project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id text not null,
  user_id text,
  name text not null,
  email text not null,
  avatar_url text,
  role text not null check (role in ('editor', 'viewer')),
  status text not null default 'offline' check (status in ('online', 'idle', 'offline')),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, lower(email))
);

create index if not exists idx_editor_project_collaborators_project_owner on editor_project_collaborators(project_id, owner_id);

create table if not exists editor_project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id text not null,
  actor_user_id text,
  actor_name text not null,
  action text not null,
  activity_type text not null check (activity_type in ('edit', 'comment', 'collaboration', 'system')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_editor_project_activity_project_owner on editor_project_activity(project_id, owner_id, created_at desc);
