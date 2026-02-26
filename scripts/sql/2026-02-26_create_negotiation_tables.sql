CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  broker_id TEXT,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  list_price_minor BIGINT NOT NULL CHECK (list_price_minor >= 0),
  final_price_minor BIGINT,
  discount_basis TEXT NOT NULL DEFAULT 'none',
  state TEXT NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ,
  accepted_offer_id TEXT,
  accepted_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_created ON deals (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_created ON deals (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_seller_created ON deals (seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  discount_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_deal_created ON offers (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_status_expires ON offers (status, expires_at);

CREATE TABLE IF NOT EXISTS deal_events (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_role TEXT,
  actor_id TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_events_deal_created ON deal_events (deal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS discount_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku TEXT,
  role_scope TEXT NOT NULL DEFAULT 'all',
  auto_accept_threshold_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
  auto_reject_threshold_percent NUMERIC(7,4) NOT NULL DEFAULT 100,
  settlement_floor_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
  settlement_ceiling_percent NUMERIC(7,4) NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_policies_tenant_sku_active ON discount_policies (tenant_id, sku, is_active);

CREATE TABLE IF NOT EXISTS broker_matches (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  broker_id TEXT NOT NULL,
  settlement_amount_minor BIGINT NOT NULL CHECK (settlement_amount_minor >= 0),
  settlement_reason TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_matches_deal_created ON broker_matches (deal_id, created_at DESC);
