-- Email broadcast queue + retry support

CREATE TABLE IF NOT EXISTS email_broadcast_jobs (
  id SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES email_broadcasts(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  triggered_by VARCHAR(30) NOT NULL DEFAULT 'schedule',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 20,
  locked_at TIMESTAMP WITH TIME ZONE,
  lock_token VARCHAR(120),
  last_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uniq_email_broadcast_job_per_broadcast UNIQUE (broadcast_id),
  CONSTRAINT chk_email_broadcast_job_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT chk_email_broadcast_job_triggered_by CHECK (triggered_by IN ('manual', 'schedule'))
);

CREATE INDEX IF NOT EXISTS idx_email_broadcast_jobs_due ON email_broadcast_jobs(status, scheduled_for, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_email_broadcast_jobs_lock ON email_broadcast_jobs(locked_at);

ALTER TABLE email_broadcast_recipients
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lock_token VARCHAR(120),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

ALTER TABLE email_broadcast_recipients
  DROP CONSTRAINT IF EXISTS chk_email_broadcast_recipient_status;

ALTER TABLE email_broadcast_recipients
  ADD CONSTRAINT chk_email_broadcast_recipient_status CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped'));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_broadcast_recipients_idempotency_key
  ON email_broadcast_recipients(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_broadcast_recipients_due
  ON email_broadcast_recipients(broadcast_id, status, next_retry_at);

