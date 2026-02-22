-- Live control persistence for dashboard stream studio.
-- Extends streams.settings->liveControl and adds dedicated moderation/poll/audit tables.

create table if not exists stream_live_control_polls (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references streams(id) on delete cascade,
  question text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  options jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stream_live_control_polls_stream_id on stream_live_control_polls(stream_id);
create index if not exists idx_stream_live_control_polls_status on stream_live_control_polls(status);

create table if not exists stream_live_control_audit_logs (
  id bigserial primary key,
  stream_id uuid not null references streams(id) on delete cascade,
  actor_user_id uuid not null references users(id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stream_live_control_audit_stream_id on stream_live_control_audit_logs(stream_id, created_at desc);
create index if not exists idx_stream_live_control_audit_actor on stream_live_control_audit_logs(actor_user_id, created_at desc);

update streams
set settings = jsonb_set(
  coalesce(settings::jsonb, '{}'::jsonb),
  '{liveControl}',
  coalesce(settings::jsonb->'liveControl', jsonb_build_object(
    'streamId', id,
    'visibility', jsonb_build_object('defaultVisibility', 'public', 'resolvedVisibility', 'public'),
    'scheduledMetadata', jsonb_build_object('trailerAssetId', null, 'scheduledAt', scheduled_start),
    'dualStream', jsonb_build_object('mode', 'single', 'primaryOrientation', 'horizontal', 'linkedStreamId', null, 'sharedChatEnabled', false),
    'membersOnly', jsonb_build_object('enabled', false, 'transitionedAt', null),
    'moderation', jsonb_build_object('pinnedMessageId', null, 'qna', jsonb_build_object('status', 'idle', 'selectedQuestionId', null, 'startedAt', null, 'endedAt', null), 'polls', '[]'::jsonb),
    'updatedAt', now()
  ))
)
where settings::jsonb->'liveControl' is null;
