-- Migration: Performance optimization and index creation
-- Description: Add critical indexes for faster queries and query optimization

-- Session table optimization
CREATE INDEX IF NOT EXISTS idx_neon_auth_session_user_id ON neon_auth.session(user_id);
CREATE INDEX IF NOT EXISTS idx_neon_auth_session_user_token ON neon_auth.session(user_id, token);
CREATE INDEX IF NOT EXISTS idx_neon_auth_session_expires_at ON neon_auth.session(expires_at);

-- User table optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Account table optimization
CREATE INDEX IF NOT EXISTS idx_neon_auth_account_user_id ON neon_auth.account(user_id);
CREATE INDEX IF NOT EXISTS idx_neon_auth_account_provider ON neon_auth.account(provider_id, account_id);

-- Verification table optimization
CREATE INDEX IF NOT EXISTS idx_neon_auth_verification_identifier ON neon_auth.verification(identifier);
CREATE INDEX IF NOT EXISTS idx_neon_auth_verification_expires_at ON neon_auth.verification(expires_at);

-- Authentication audit trail optimization
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id_created_at ON audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action_created_at ON audit_events(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_status_created_at ON audit_events(status, created_at DESC);

-- Session location optimization
CREATE INDEX IF NOT EXISTS idx_session_locations_user_id_timestamp ON session_locations(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_locations_ip_address ON session_locations(ip_address);

-- Device fingerprint optimization
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_verified ON device_fingerprints(user_id, is_verified);

-- Suspicious login optimization
CREATE INDEX IF NOT EXISTS idx_suspicious_logins_user_id_created_at ON suspicious_logins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_logins_status_created_at ON suspicious_logins(status, created_at DESC);

-- Security threat optimization
CREATE INDEX IF NOT EXISTS idx_security_threats_severity_created_at ON security_threats(severity DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_threats_status_resolved ON security_threats(status, resolved_at NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_security_threats_target_user ON security_threats(target_user_id);

-- Login challenge optimization
CREATE INDEX IF NOT EXISTS idx_login_challenges_user_id_expires ON login_challenges(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_login_challenges_verified ON login_challenges(verified_at NULLS LAST);

-- Account lockout optimization
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_active ON account_lockouts(user_id, locked_until DESC);

-- Password history optimization
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_user_created ON password_history(user_id, created_at DESC);

-- Recovery codes optimization
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_used ON recovery_codes(user_id, used);

-- IP reputation optimization
CREATE INDEX IF NOT EXISTS idx_ip_reputation_blocked ON ip_reputation(is_blocked);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_threat_count ON ip_reputation(threat_count DESC);

-- 2FA settings optimization
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_enabled ON user_2fa_settings(is_enabled);

-- 2FA backup codes optimization
CREATE INDEX IF NOT EXISTS idx_user_2fa_backup_codes_user_active ON user_2fa_backup_codes(user_id, is_active);

-- Enable query statistics
ALTER DATABASE neon_auth SET shared_preload_libraries = 'pg_stat_statements';

-- Create materialized view for performance analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS auth_performance_stats AS
SELECT 
  'sessions' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_count,
  NOW() as last_updated
FROM neon_auth.session
UNION ALL
SELECT 
  'users' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE email_verified = true) as active_count,
  NOW() as last_updated
FROM users
UNION ALL
SELECT 
  'suspicious_logins' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as active_count,
  NOW() as last_updated
FROM suspicious_logins;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_auth_perf_stats_metric_type ON auth_performance_stats(metric_type);

-- Create table for slow query logs
CREATE TABLE IF NOT EXISTS slow_query_logs (
  id SERIAL PRIMARY KEY,
  query_text TEXT,
  execution_time_ms INTEGER,
  rows_affected INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_logs_execution_time ON slow_query_logs(execution_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_logs_executed_at ON slow_query_logs(executed_at DESC);

-- Set up query timeout (60 seconds)
ALTER SYSTEM SET statement_timeout = '60s';

-- Set up connection pooling settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '8MB';
