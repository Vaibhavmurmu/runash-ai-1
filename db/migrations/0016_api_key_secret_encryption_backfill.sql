alter table if exists api_key_secret_material
  add column if not exists encrypted_secret text;

alter table if exists api_key_secret_material
  add column if not exists encryption_algorithm text not null default 'aes-256-gcm';

alter table if exists api_key_secret_material
  add column if not exists encryption_key_version text not null default 'v1';

update api_key_secret_material
set encrypted_secret = concat('legacy.', secret_hash)
where encrypted_secret is null;

alter table if exists api_key_secret_material
  alter column encrypted_secret set not null;
