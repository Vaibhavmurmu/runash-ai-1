-- Migration: Add password security and recovery tables
-- Description: Tables for password history, recovery codes, breach notifications, and security questions

-- Table for password history (prevent reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at DESC);

-- Table for recovery codes (backup authentication)
CREATE TABLE IF NOT EXISTS recovery_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX idx_recovery_codes_used ON recovery_codes(used);

-- Table for password breach notifications
CREATE TABLE IF NOT EXISTS breach_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  breach_count INTEGER,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breach_notifications_user_id ON breach_notifications(user_id);
CREATE INDEX idx_breach_notifications_created_at ON breach_notifications(created_at DESC);

-- Table for account recovery requests
CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_recovery_requests_user_id ON account_recovery_requests(user_id);
CREATE INDEX idx_account_recovery_requests_token ON account_recovery_requests(token);
CREATE INDEX idx_account_recovery_requests_expires_at ON account_recovery_requests(expires_at);

-- Table for security questions
CREATE TABLE IF NOT EXISTS security_questions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_questions_user_id ON security_questions(user_id);

-- Table for tracking password strength requirements by user
CREATE TABLE IF NOT EXISTS password_policy (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT TRUE,
  require_lowercase BOOLEAN DEFAULT TRUE,
  require_numbers BOOLEAN DEFAULT TRUE,
  require_special BOOLEAN DEFAULT FALSE,
  max_age_days INTEGER, -- NULL = no expiration
  password_reuse_prevention INTEGER DEFAULT 5, -- Number of old passwords to check
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_policy_user_id ON password_policy(user_id);

-- Table for email change verification workflow
CREATE TABLE IF NOT EXISTS email_change_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email VARCHAR(255),
  new_email VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) NOT NULL UNIQUE,
  verification_code VARCHAR(10),
  old_email_verified BOOLEAN DEFAULT FALSE,
  new_email_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_change_requests_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_requests_token ON email_change_requests(verification_token);
CREATE INDEX idx_email_change_requests_expires_at ON email_change_requests(expires_at);

-- Update users table to support email change workflow
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for email changes
CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
CREATE INDEX IF NOT EXISTS idx_users_password_expires_at ON users(password_expires_at);
