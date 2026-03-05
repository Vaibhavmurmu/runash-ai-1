-- Migration: Add monitoring, auditing, and compliance tables
-- Description: Comprehensive audit logging, security monitoring, and data compliance

-- Table for audit events (compliance trail)
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'success', -- success, failure
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_status ON audit_events(status);

-- Table for security threats and incidents
CREATE TABLE IF NOT EXISTS security_threats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- brute_force, credential_stuffing, suspicious_activity, account_compromise, ddos
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  description TEXT,
  source_ip INET,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  risk_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, resolved, false_positive
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES admin_users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_threats_type ON security_threats(type);
CREATE INDEX idx_security_threats_severity ON security_threats(severity);
CREATE INDEX idx_security_threats_target_user_id ON security_threats(target_user_id);
CREATE INDEX idx_security_threats_status ON security_threats(status);
CREATE INDEX idx_security_threats_created_at ON security_threats(created_at DESC);

-- Table for tracking user consents (GDPR)
CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL, -- marketing, analytics, data_processing, etc.
  given BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_consent_type ON user_consents(consent_type);

-- Table for user deletion requests (Right to be forgotten)
CREATE TABLE IF NOT EXISTS user_deletions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deletion_scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, executed, cancelled
  cancelled_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_deletions_user_id ON user_deletions(user_id);
CREATE INDEX idx_user_deletions_status ON user_deletions(status);
CREATE INDEX idx_user_deletions_scheduled_for ON user_deletions(deletion_scheduled_for);

-- Table for API activity logging
CREATE TABLE IF NOT EXISTS api_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL, -- GET, POST, etc.
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_activity_logs_user_id ON api_activity_logs(user_id);
CREATE INDEX idx_api_activity_logs_endpoint ON api_activity_logs(endpoint);
CREATE INDEX idx_api_activity_logs_created_at ON api_activity_logs(created_at DESC);

-- Table for admin actions (with audit trail)
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL, -- impersonate_user, force_logout, lock_account, etc.
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_action ON admin_actions(action);
CREATE INDEX idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Table for IP reputation tracking
CREATE TABLE IF NOT EXISTS ip_reputation (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  threat_count INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ip_reputation_is_blocked ON ip_reputation(is_blocked);
CREATE INDEX idx_ip_reputation_threat_count ON ip_reputation(threat_count);

-- Table for security policy enforcement
CREATE TABLE IF NOT EXISTS security_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  policy_type VARCHAR(50), -- password, mfa, session, etc.
  rules JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_policies_policy_type ON security_policies(policy_type);
CREATE INDEX idx_security_policies_enabled ON security_policies(enabled);

-- Add columns for user deletion workflow
ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_for ON users(deletion_scheduled_for);
