-- Inbound email reply architecture tables

CREATE TABLE IF NOT EXISTS email_reply_threads (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  provider_thread_id VARCHAR(255),
  subject TEXT,
  contact_id INTEGER REFERENCES email_contacts(id) ON DELETE SET NULL,
  contact_email VARCHAR(255) NOT NULL,
  broadcast_id INTEGER REFERENCES email_broadcasts(id) ON DELETE SET NULL,
  campaign_id INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_email_reply_thread_status CHECK (status IN ('open', 'closed', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_reply_threads_provider_thread
  ON email_reply_threads(provider, provider_thread_id)
  WHERE provider_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reply_threads_contact_email
  ON email_reply_threads(contact_email, created_at DESC);

CREATE TABLE IF NOT EXISTS email_inbound_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES email_reply_threads(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_message_id VARCHAR(255) NOT NULL,
  provider_thread_id VARCHAR(255),
  from_email VARCHAR(255) NOT NULL,
  to_email VARCHAR(255),
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uniq_email_inbound_provider_message UNIQUE (provider, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_inbound_messages_thread_received
  ON email_inbound_messages(thread_id, received_at DESC);

CREATE TABLE IF NOT EXISTS email_reply_actions (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES email_reply_threads(id) ON DELETE CASCADE,
  inbound_message_id INTEGER REFERENCES email_inbound_messages(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL DEFAULT 'draft',
  status VARCHAR(30) NOT NULL,
  confidence NUMERIC(5, 4),
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  draft_subject TEXT,
  draft_body TEXT,
  edited_body TEXT,
  final_recipient VARCHAR(255),
  sent_message_id VARCHAR(255),
  actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
  actor_id INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_email_reply_action_status CHECK (status IN ('drafted', 'sent', 'skipped', 'failed')),
  CONSTRAINT chk_email_reply_action_actor CHECK (actor_type IN ('system', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_email_reply_actions_thread_created
  ON email_reply_actions(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_reply_actions_review_queue
  ON email_reply_actions(status, requires_human_review, created_at DESC);
