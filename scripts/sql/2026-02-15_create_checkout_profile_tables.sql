-- Checkout-link + checkout-session + customer profile/payment vault references
-- Sensitive profile fields are encrypted at application layer before persistence.

CREATE TABLE IF NOT EXISTS checkout_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL,
  amount_min NUMERIC(15,2),
  amount_max NUMERIC(15,2),
  fixed_amount NUMERIC(15,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  product_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkout_links_amount_rule_chk CHECK (
    (fixed_amount IS NOT NULL AND amount_min IS NULL AND amount_max IS NULL)
    OR (fixed_amount IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_checkout_links_owner_status ON checkout_links(owner_user_id, status);

CREATE TABLE IF NOT EXISTS customer_payment_method_vault_refs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_token_id TEXT NOT NULL,
  method_type TEXT NOT NULL,
  last4 TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_provider_token_per_customer UNIQUE(customer_id, provider, provider_token_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_method_vault_customer ON customer_payment_method_vault_refs(customer_id, status);

CREATE TABLE IF NOT EXISTS customer_checkout_profiles (
  customer_id TEXT PRIMARY KEY,
  billing_address_encrypted TEXT,
  shipping_address_encrypted TEXT,
  default_payment_method_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
  backup_payment_method_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY,
  checkout_link_id TEXT NOT NULL REFERENCES checkout_links(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  payment_method_ref_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
  method_type TEXT,
  device_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  browser_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_customer_created ON checkout_sessions(customer_id, created_at DESC);
