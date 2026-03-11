-- Backward-compatible migration notes:
-- 1) Adds provider session identifier persistence for live stream session reconciliation.
-- 2) Existing payment/auth contracts remain unchanged (additive schema update).
-- 3) Rollback path: drop provider_session_id column and related index if needed.

alter table if exists live_stream_endpoints
  add column if not exists provider_session_id text;

update live_stream_endpoints
set provider_session_id = coalesce(provider_session_id, metadata->>'providerSessionId', session_id::text)
where provider_session_id is null;

alter table if exists live_stream_endpoints
  alter column provider_session_id set not null;

create index if not exists idx_live_stream_endpoints_provider_session
  on live_stream_endpoints (provider_session_id);
