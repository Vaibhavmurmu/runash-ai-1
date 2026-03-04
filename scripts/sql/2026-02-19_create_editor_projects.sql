-- Editor projects persistence for production editor CRUD
create table if not exists editor_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'processing', 'published', 'archived')),
  selected_model text not null default 'wan-2.1',
  timeline jsonb not null default '{"duration": 10, "fps": 30, "tracks": []}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_editor_projects_user_id on editor_projects(user_id);
create index if not exists idx_editor_projects_updated_at on editor_projects(updated_at desc);

create or replace function touch_editor_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_editor_projects_updated_at on editor_projects;
create trigger trg_editor_projects_updated_at
before update on editor_projects
for each row
execute function touch_editor_projects_updated_at();
