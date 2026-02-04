-- Core schema for users, chats, messages, and minimal streams/products (if missing)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text not null default 'user',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Optional streams/products for analytics (no-ops if exist)
create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  category text,
  status text not null default 'scheduled',
  stream_key text,
  rtmp_url text,
  thumbnail_url text,
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  max_viewers int not null default 0,
  total_revenue numeric not null default 0,
  ai_agent_id uuid,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  description text,
  price numeric not null default 0,
  category text,
  image_url text,
  in_stock boolean not null default true,
  featured boolean not null default false,
  sales_count int not null default 0,
  inventory_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
