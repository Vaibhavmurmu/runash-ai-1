-- Harden editor project/timeline/segment ownership, timestamps, and metadata queryability.

create index if not exists idx_editor_projects_owner_updated_at on editor_projects(owner_id, updated_at desc);
create index if not exists idx_editor_timelines_owner_project on editor_timelines(owner_id, project_id, updated_at desc);
create index if not exists idx_editor_segments_owner_project_timeline on editor_segments(owner_id, project_id, timeline_id, start_seconds);
create index if not exists idx_editor_segments_metadata_gin on editor_segments using gin (metadata jsonb_path_ops);

alter table editor_segments
  drop constraint if exists chk_editor_segments_valid_range;

alter table editor_segments
  add constraint chk_editor_segments_valid_range
  check (end_seconds >= start_seconds);
