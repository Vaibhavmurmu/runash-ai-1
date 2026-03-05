-- Migration: Add session hardening tables
-- Description: Tables for geolocation tracking, device fingerprints, and suspicious login detection

-- Table for storing session locations
CREATE TABLE IF NOT EXISTS session_locations (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city VARCHAR(255),
  region VARCHAR(255),
  country VARCHAR(100),
  timezone VARCHAR(50),
  isp VARCHAR(255),
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_coordinates CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
    AND longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  )
);

CREATE INDEX idx_session_locations_user_id ON session_locations(user_id);
CREATE INDEX idx_session_locations_timestamp ON session_locations(timestamp DESC);
CREATE INDEX idx_session_locations_ip_address ON session_locations(ip_address);

-- Table for tracking device fingerprints
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  user_agent TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_device UNIQUE (user_id, device_hash)
);

CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_verified ON device_fingerprints(is_verified);

-- Table for storing suspicious login attempts
CREATE TABLE IF NOT EXISTS suspicious_logins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  risk_score INTEGER DEFAULT 0,
  reasons JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, dismissed, confirmed
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by INTEGER REFERENCES admin_users(id),
  action_taken VARCHAR(50), -- email_sent, mfa_required, account_locked
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suspicious_logins_user_id ON suspicious_logins(user_id);
CREATE INDEX idx_suspicious_logins_created_at ON suspicious_logins(created_at DESC);
CREATE INDEX idx_suspicious_logins_status ON suspicious_logins(status);

-- Table for login challenges (email verification, TOTP, security questions)
CREATE TABLE IF NOT EXISTS login_challenges (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- email_verification, totp, security_questions
  verified_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_login_challenges_session_id ON login_challenges(session_id);
CREATE INDEX idx_login_challenges_user_id ON login_challenges(user_id);
CREATE INDEX idx_login_challenges_expires_at ON login_challenges(expires_at);

-- Table for account lockout tracking
CREATE TABLE IF NOT EXISTS account_lockouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL, -- too_many_failed_attempts, suspicious_activity, manual
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  unlock_token VARCHAR(255),
  locked_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_lockout CHECK (locked_until > created_at)
);

CREATE INDEX idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_locked_until ON account_lockouts(locked_until);

-- Table for concurrent session limits
CREATE TABLE IF NOT EXISTS session_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_concurrent_sessions INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_limit UNIQUE (user_id)
);

CREATE INDEX idx_session_limits_user_id ON session_limits(user_id);

-- Add columns to session table if not already present
ALTER TABLE neon_auth.session
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES session_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS device_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_mfa_verification BOOLEAN DEFAULT FALSE;

-- Create indexes for session analysis
CREATE INDEX IF NOT EXISTS idx_session_is_suspicious ON neon_auth.session(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_session_device_hash ON neon_auth.session(device_hash);
