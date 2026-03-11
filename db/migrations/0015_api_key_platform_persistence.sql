create table if not exists api_key_metadata (
  id uuid primary key,
  name text not null,
  scopes jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  last_used_at timestamptz,
  secret_prefix text not null,
  secret_masked text not null
);

create table if not exists api_key_secret_material (
  id bigserial primary key,
  api_key_id uuid not null references api_key_metadata(id) on delete cascade,
  secret_hash text not null,
  encrypted_secret text not null,
  hash_algorithm text not null,
  encryption_algorithm text not null default 'aes-256-gcm',
  encryption_key_version text not null default 'v1',
  rotated_from_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_key_secret_material_key_created
  on api_key_secret_material(api_key_id, created_at desc);

create table if not exists api_key_rotation_history (
  id bigserial primary key,
  api_key_id uuid not null references api_key_metadata(id) on delete cascade,
  action text not null check (action in ('created', 'rotated', 'revoked')),
  happened_at timestamptz not null default now(),
  prefix_snapshot text not null,
  secret_masked_snapshot text not null
);

create index if not exists idx_api_key_rotation_history_key_happened
  on api_key_rotation_history(api_key_id, happened_at desc);

create table if not exists api_key_usage_counters (
  id bigserial primary key,
  api_key_id uuid not null references api_key_metadata(id) on delete cascade,
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  unique(api_key_id, bucket_start)
);

create index if not exists idx_api_key_usage_counters_bucket
  on api_key_usage_counters(bucket_start desc);
