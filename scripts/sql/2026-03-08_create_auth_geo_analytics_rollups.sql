-- 2026-03-08 auth/security geo analytics hardening + dashboard rollups
-- Purpose:
-- 1) Build privacy-preserving IP geo enrichment cache
-- 2) Add materialized aggregates for auth/security dashboard latency
-- 3) Enforce retention windows for location-derived data
-- 4) Track geo/session telemetry ingestion health for analytics pipelines

CREATE TABLE IF NOT EXISTS auth_ip_geo_cache (
  ip_address INET PRIMARY KEY,
  country_code TEXT NOT NULL DEFAULT 'ZZ',
  country_name TEXT NOT NULL DEFAULT 'Unknown',
  region_name TEXT,
  source TEXT NOT NULL DEFAULT 'pending_lookup',
  last_enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source IN ('pending_lookup', 'event_payload', 'threat_payload', 'lookup_table'))
);

CREATE INDEX IF NOT EXISTS idx_auth_ip_geo_cache_expires_at
  ON auth_ip_geo_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_ip_geo_cache_country
  ON auth_ip_geo_cache (country_code, country_name);

CREATE TABLE IF NOT EXISTS auth_analytics_ingestion_telemetry (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  source TEXT NOT NULL,
  telemetry_type TEXT NOT NULL,
  records_ingested BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, source, telemetry_type)
);

CREATE INDEX IF NOT EXISTS idx_auth_analytics_ingestion_telemetry_created_at
  ON auth_analytics_ingestion_telemetry (created_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_auth_geographic_login_daily AS
SELECT
  DATE(ae.created_at) AS date,
  COALESCE(geo.country_name, 'Unknown') AS country_name,
  COUNT(*)::BIGINT AS logins
FROM auth_events ae
LEFT JOIN auth_ip_geo_cache geo
  ON geo.ip_address = ae.ip_address
  AND geo.expires_at > NOW()
WHERE ae.event_type = 'login'
  AND ae.success = true
GROUP BY DATE(ae.created_at), COALESCE(geo.country_name, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_auth_geographic_login_daily_key
  ON mv_auth_geographic_login_daily (date, country_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_security_geographic_threat_daily AS
SELECT
  DATE(st.first_detected) AS date,
  COALESCE(geo.country_name, 'Unknown') AS country_name,
  COUNT(*)::BIGINT AS threats,
  AVG(st.risk_score)::numeric AS avg_risk_score
FROM security_threats st
LEFT JOIN auth_ip_geo_cache geo
  ON geo.ip_address = st.source_ip
  AND geo.expires_at > NOW()
GROUP BY DATE(st.first_detected), COALESCE(geo.country_name, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_security_geographic_threat_daily_key
  ON mv_security_geographic_threat_daily (date, country_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_auth_session_concurrency_daily AS
WITH session_windows AS (
  SELECT
    DATE(created_at) AS date,
    created_at AS started_at,
    COALESCE(last_activity, expires_at, NOW()) AS ended_at,
    user_id,
    EXTRACT(EPOCH FROM (COALESCE(last_activity, expires_at, NOW()) - created_at)) AS session_seconds
  FROM user_sessions
  WHERE COALESCE(last_activity, expires_at, NOW()) >= created_at
),
concurrency_events AS (
  SELECT date, started_at AS event_time, 1 AS delta FROM session_windows
  UNION ALL
  SELECT date, ended_at AS event_time, -1 AS delta FROM session_windows
),
concurrency_timeline AS (
  SELECT
    date,
    event_time,
    SUM(delta) OVER (PARTITION BY date ORDER BY event_time, delta DESC) AS concurrent_sessions
  FROM concurrency_events
)
SELECT
  sw.date,
  COUNT(DISTINCT sw.user_id)::BIGINT AS active_users,
  COUNT(*)::BIGINT AS current_sessions,
  AVG(sw.session_seconds)::numeric AS avg_session_seconds,
  COALESCE(MAX(ct.concurrent_sessions), 0)::BIGINT AS peak_concurrent_users
FROM session_windows sw
LEFT JOIN concurrency_timeline ct ON ct.date = sw.date
GROUP BY sw.date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_auth_session_concurrency_daily_key
  ON mv_auth_session_concurrency_daily (date);

CREATE OR REPLACE FUNCTION refresh_auth_security_dashboard_rollups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auth_ip_geo_cache
  WHERE expires_at <= NOW();

  INSERT INTO auth_analytics_ingestion_telemetry (metric_date, source, telemetry_type, records_ingested, metadata)
  VALUES
    (
      CURRENT_DATE,
      'auth_events',
      'geo_ip_enrichment',
      (SELECT COUNT(*)::bigint FROM auth_ip_geo_cache WHERE expires_at > NOW()),
      jsonb_build_object('retention_days', 90)
    ),
    (
      CURRENT_DATE,
      'user_sessions',
      'session_concurrency',
      (SELECT COUNT(*)::bigint FROM user_sessions),
      jsonb_build_object('view', 'mv_auth_session_concurrency_daily')
    )
  ON CONFLICT (metric_date, source, telemetry_type) DO UPDATE
  SET
    records_ingested = EXCLUDED.records_ingested,
    metadata = EXCLUDED.metadata,
    created_at = NOW();

  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auth_geographic_login_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_security_geographic_threat_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auth_session_concurrency_daily;
END;
$$;
