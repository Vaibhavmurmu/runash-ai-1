-- RunAsh chat session storage migration
-- Adds DB-backed storage for sessions and session messages.

create table if not exists runash_chat_sessions (
  id text primary key default ('s-' || replace(gen_random_uuid()::text, '-', '')),
  user_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runash_chat_session_messages (
  id bigserial primary key,
  session_id text not null references runash_chat_sessions(id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  message_type text not null default 'text' check (message_type in ('text', 'product', 'recipe', 'tip', 'automation')),
  created_at timestamptz not null default now()
);

create index if not exists idx_runash_chat_sessions_user_updated
  on runash_chat_sessions (user_id, updated_at desc);

create index if not exists idx_runash_chat_messages_session_created
  on runash_chat_session_messages (session_id, created_at desc);
