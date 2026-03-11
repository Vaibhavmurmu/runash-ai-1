create table if not exists editor_project_collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor_projects(id) on delete cascade,
  owner_id text not null,
  invited_by_user_id text,
  invited_by_name text,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id text,
  accepted_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, email, status)
);

create index if not exists idx_editor_project_collab_invites_project_owner
  on editor_project_collaboration_invites(project_id, owner_id, created_at desc);

create index if not exists idx_editor_project_collab_invites_token
  on editor_project_collaboration_invites(token);
