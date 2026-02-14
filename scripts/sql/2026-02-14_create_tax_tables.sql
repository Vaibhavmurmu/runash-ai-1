-- RunAsh billing tax domain models and indexes
CREATE TABLE IF NOT EXISTS tax_registrations (
  id BIGSERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  state_code VARCHAR(16),
  registration_number TEXT NOT NULL,
  entity_name TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id BIGSERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  state_code VARCHAR(16),
  tax_type VARCHAR(32) NOT NULL,
  name TEXT NOT NULL,
  rate_percent NUMERIC(8,4) NOT NULL,
  inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_calculations (
  id BIGSERIAL PRIMARY KEY,
  source_type VARCHAR(32) NOT NULL,
  source_id TEXT NOT NULL,
  user_id INTEGER,
  country_code VARCHAR(2) NOT NULL,
  state_code VARCHAR(16),
  currency VARCHAR(3) NOT NULL,
  taxable_amount NUMERIC(15,2) NOT NULL,
  total_tax_amount NUMERIC(15,2) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,
  jurisdiction_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tax_calculation_source UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS tax_line_items (
  id BIGSERIAL PRIMARY KEY,
  tax_calculation_id BIGINT NOT NULL REFERENCES tax_calculations(id) ON DELETE CASCADE,
  tax_rate_id BIGINT REFERENCES tax_rates(id),
  jurisdiction_level VARCHAR(16) NOT NULL,
  jurisdiction_code VARCHAR(32) NOT NULL,
  tax_type VARCHAR(32) NOT NULL,
  tax_name TEXT NOT NULL,
  rate_percent NUMERIC(8,4) NOT NULL,
  taxable_amount NUMERIC(15,2) NOT NULL,
  tax_amount NUMERIC(15,2) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_country_state ON tax_rates(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_source ON tax_calculations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_country_state ON tax_calculations(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_tax_line_items_calculation ON tax_line_items(tax_calculation_id);
