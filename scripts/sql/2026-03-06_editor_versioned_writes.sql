alter table if exists editor_projects
  add column if not exists version bigint not null default 0,
  add column if not exists updated_by uuid references users(id) on delete set null;

alter table if exists editor_timelines
  add column if not exists version bigint not null default 0,
  add column if not exists updated_by uuid references users(id) on delete set null;

create index if not exists idx_editor_projects_owner_version on editor_projects(owner_id, version);
create index if not exists idx_editor_timelines_project_version on editor_timelines(project_id, version);
