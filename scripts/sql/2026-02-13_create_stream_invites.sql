-- Dashboard stream invite persistence
create table if not exists stream_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stream_id uuid not null references streams(id) on delete cascade,
  email text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_stream_invites_user_id on stream_invites(user_id);
create index if not exists idx_stream_invites_stream_id on stream_invites(stream_id);
