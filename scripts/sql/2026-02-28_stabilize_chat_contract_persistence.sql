-- Stabilize chat contracts: idempotency + attachment persistence + cursor consistency

alter table if exists mobile_chat_messages
  add column if not exists cursor_seq bigserial;

alter table if exists mobile_chat_messages
  add column if not exists client_request_id text;

create unique index if not exists idx_mobile_chat_cursor_seq
  on mobile_chat_messages (cursor_seq);

create unique index if not exists idx_mobile_chat_client_request_id
  on mobile_chat_messages (client_request_id)
  where client_request_id is not null;

create table if not exists mobile_chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references mobile_chat_messages(id) on delete cascade,
  attachment_name text not null,
  attachment_type text not null,
  attachment_size integer not null,
  attachment_url text,
  attachment_checksum text,
  created_at timestamptz not null default now()
);

create table if not exists stream_chat_messages (
  id text primary key,
  stream_id text not null,
  user_id text not null,
  username text not null,
  text_content text not null,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_stream_chat_messages_dedupe
  on stream_chat_messages (stream_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists stream_chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id text not null references stream_chat_messages(id) on delete cascade,
  attachment_name text not null,
  attachment_type text not null,
  attachment_size integer not null,
  attachment_url text,
  attachment_checksum text,
  created_at timestamptz not null default now()
);
