alter table if exists editor_segments
  add column if not exists lock_owner_user_id text,
  add column if not exists lock_acquired_at timestamptz,
  add column if not exists lock_updated_at timestamptz,
  add column if not exists lock_expires_at timestamptz;

create index if not exists idx_editor_segments_project_lock_expiry
  on editor_segments(project_id, lock_expires_at);

create index if not exists idx_editor_segments_lock_owner
  on editor_segments(lock_owner_user_id)
  where lock_owner_user_id is not null;
