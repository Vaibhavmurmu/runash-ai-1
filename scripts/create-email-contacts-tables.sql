-- Email Contacts Management
-- Adds first-class contact/audience support for broadcast workflows.

CREATE TABLE IF NOT EXISTS email_contacts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'subscribed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source VARCHAR(100) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_contact_tags (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (contact_id, tag)
);

CREATE TABLE IF NOT EXISTS email_contact_import_jobs (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_contacts_status ON email_contacts(status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_updated_at ON email_contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_contact_tags_tag ON email_contact_tags(tag);
CREATE INDEX IF NOT EXISTS idx_email_contact_tags_contact_id ON email_contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_contact_import_jobs_status ON email_contact_import_jobs(status);
