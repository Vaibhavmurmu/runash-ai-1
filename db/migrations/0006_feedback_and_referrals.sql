-- 0006_feedback_and_referrals.sql
-- Feedback and referral lifecycle persistence.

CREATE TABLE IF NOT EXISTS feedback_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'dashboard',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'resolved')),
  triage_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_user_created_at
  ON feedback_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_status_created_at
  ON feedback_entries (status, created_at DESC);

CREATE TABLE IF NOT EXISTS referral_invites (
  id BIGSERIAL PRIMARY KEY,
  inviter_user_id TEXT NOT NULL,
  inviter_email TEXT,
  invitee_email TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'converted', 'expired')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  last_sent_ip TEXT,
  UNIQUE (invite_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_invites_inviter_invitee_unique
  ON referral_invites (inviter_user_id, LOWER(invitee_email));

CREATE INDEX IF NOT EXISTS idx_referral_invites_inviter_status
  ON referral_invites (inviter_user_id, status, sent_at DESC);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id BIGSERIAL PRIMARY KEY,
  invite_id BIGINT NOT NULL REFERENCES referral_invites(id) ON DELETE CASCADE,
  inviter_user_id TEXT NOT NULL,
  converted_user_id TEXT,
  conversion_source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invite_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_inviter_created_at
  ON referral_conversions (inviter_user_id, created_at DESC);
