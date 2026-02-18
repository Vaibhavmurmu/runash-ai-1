-- Identity protocol extension tables for enterprise SSO, SCIM, OAuth Device Grant, and SIWE.
-- Additive migration to preserve existing auth/payment contracts.

CREATE TABLE IF NOT EXISTS sso_organization_mappings (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES sso_organizations(id) ON DELETE CASCADE,
  mapping_key TEXT NOT NULL,
  mapping_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, mapping_key)
);

CREATE TABLE IF NOT EXISTS scim_resources (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES sso_organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('User', 'Group')),
  external_id TEXT NOT NULL,
  display_name TEXT,
  payload JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, resource_type, external_id)
);

CREATE TABLE IF NOT EXISTS scim_audit_trails (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES sso_organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_external_id TEXT,
  action TEXT NOT NULL,
  actor TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_device_authorization_sessions (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  user_id BIGINT,
  expires_at TIMESTAMPTZ NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 5,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS siwe_nonces (
  id BIGSERIAL PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  wallet_address TEXT,
  domain TEXT,
  chain_id INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scim_resources_org_type ON scim_resources(organization_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_scim_audit_org_created ON scim_audit_trails(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_device_client_status ON oauth_device_authorization_sessions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_siwe_nonce_expires ON siwe_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet ON wallet_sessions(wallet_address);
