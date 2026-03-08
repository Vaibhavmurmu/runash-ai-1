-- 2026-03-08 auth/security geo analytics hardening + dashboard rollups
-- Purpose:
-- 1) Build privacy-preserving IP geo enrichment cache
-- 2) Add materialized aggregates for auth/security dashboard latency
-- 3) Enforce retention windows for location-derived data

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

CREATE OR REPLACE FUNCTION refresh_auth_security_dashboard_rollups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auth_ip_geo_cache
  WHERE expires_at <= NOW();

  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auth_geographic_login_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_security_geographic_threat_daily;
END;
$$;
