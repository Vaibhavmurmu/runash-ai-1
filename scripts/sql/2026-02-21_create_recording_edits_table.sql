-- Backward-compatible migration notes:
-- 1) Introduces a dedicated recording_edits table so edit-specific attributes are not stored on streams.
-- 2) Existing streams API contracts remain unchanged; this is additive and safe to deploy before application code.
-- 3) Rollback path: drop table recording_edits if route rollout is reverted.

create table if not exists recording_edits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  original_stream_id text not null,
  title text not null,
  status text not null default 'processing',
  start_time timestamptz not null,
  end_time timestamptz not null,
  filters jsonb not null default '{}'::jsonb,
  audio_level numeric(4, 2) not null default 1,
  export_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_recording_edits_time_range check (end_time > start_time),
  constraint chk_recording_edits_audio_level check (audio_level >= 0 and audio_level <= 2)
);

create index if not exists idx_recording_edits_user_created_at
  on recording_edits(user_id, created_at desc);

create index if not exists idx_recording_edits_original_stream
  on recording_edits(original_stream_id, created_at desc);
