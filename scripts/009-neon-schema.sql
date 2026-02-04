-- Run this on your Neon Postgres to back the dashboard with real data.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  category text not null default 'General',
  image_url text,
  in_stock boolean not null default true,
  featured boolean not null default false,
  sales_count integer not null default 0,
  inventory_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'General',
  status text not null check (status in ('live', 'scheduled', 'ended')),
  stream_key text,
  rtmp_url text,
  thumbnail_url text,
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  max_viewers integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  ai_agent_id uuid,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stream_metrics (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references streams(id) on delete cascade,
  timestamp timestamptz not null default now(),
  viewer_count integer not null default 0,
  engagement_rate numeric(5,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  chat_messages integer not null default 0,
  new_followers integer not null default 0,
  product_clicks integer not null default 0
);

create index if not exists idx_stream_metrics_stream_id on stream_metrics(stream_id);

create table if not exists analytics_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  total_streams integer not null default 0,
  total_viewers integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  total_orders integer not null default 0,
  avg_engagement_rate numeric(5,2) not null default 0,
  top_product_id uuid references products(id),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Basic commerce objects for checkout
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  email text not null,
  status text not null default 'unpaid',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  name text not null,
  price numeric(12,2) not null,
  quantity integer not null default 1
);

-- Seed a demo user if none exists
insert into users (id, email, name, avatar_url)
select gen_random_uuid(), 'demo@runash.ai', 'RunAsh Demo', '/placeholder-user.jpg'
where not exists (select 1 from users where email='demo@runash.ai');

-- Optionally seed some products if table is empty
insert into products (user_id, name, description, price, category, in_stock, featured, sales_count, inventory_count)
select u.id, 'Organic Vitamin C Serum', 'Premium Vitamin C serum for radiant skin', 49.99, 'Skincare', true, true, 234, 150
from users u where u.email='demo@runash.ai' and not exists (select 1 from products);
