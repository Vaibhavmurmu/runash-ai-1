-- Email broadcast authoring and send workflow

CREATE TABLE IF NOT EXISTS email_broadcasts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  preheader VARCHAR(255),
  template_key VARCHAR(120) NOT NULL,
  template_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience_filter JSONB NOT NULL DEFAULT '{"status":"subscribed"}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_email_broadcast_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent'))
);

CREATE TABLE IF NOT EXISTS email_broadcast_recipients (
  id SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES email_broadcasts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES email_contacts(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  delivery_message_id VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_email_broadcast_recipient_status CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT uniq_email_broadcast_recipient UNIQUE (broadcast_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_status_updated_at ON email_broadcasts(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_broadcast_recipients_broadcast_id ON email_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_email_broadcast_recipients_status ON email_broadcast_recipients(status);
