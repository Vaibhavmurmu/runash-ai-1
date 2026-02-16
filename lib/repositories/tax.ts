import { queryMany, queryOne, sql } from "@/lib/db"

export interface TaxRateRecord {
  id: number
  countryCode: string
  stateCode: string | null
  taxType: string
  name: string
  ratePercent: number
  inclusive: boolean
  productTaxCode: string | null
}

export interface ProductTaxClassificationRecord {
  id: number
  code: string
  name: string
  description: string | null
  defaultTaxType: string
  defaultInclusive: boolean
  metadata: Record<string, unknown>
}

export interface TaxLineItemInput {
  taxRateId?: number | null
  jurisdictionLevel: "country" | "state" | "city"
  jurisdictionCode: string
  taxType: string
  taxName: string
  ratePercent: number
  taxableAmount: number
  taxAmount: number
  metadata?: Record<string, unknown>
}

let taxTablesReady = false

async function ensureTaxTables() {
  if (taxTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
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
      product_tax_code VARCHAR(64),
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

    CREATE TABLE IF NOT EXISTS product_tax_classifications (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      default_tax_type VARCHAR(32) NOT NULL,
      default_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transaction_tax_line_items (
      id BIGSERIAL PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      tax_calculation_id BIGINT NOT NULL REFERENCES tax_calculations(id) ON DELETE CASCADE,
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
    CREATE INDEX IF NOT EXISTS idx_tax_rates_country_state_product ON tax_rates(country_code, state_code, product_tax_code);
    CREATE INDEX IF NOT EXISTS idx_tax_calculations_source ON tax_calculations(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_tax_calculations_country_state ON tax_calculations(country_code, state_code);
    CREATE INDEX IF NOT EXISTS idx_tax_line_items_calculation ON tax_line_items(tax_calculation_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_tax_line_items_transaction ON transaction_tax_line_items(transaction_id, created_at DESC);

    INSERT INTO product_tax_classifications (code, name, description, default_tax_type, default_inclusive, metadata)
    VALUES
      ('physical_goods', 'Physical Goods', 'Tangible product sold and shipped to customer', 'sales_tax', false, '{"scope":"default"}'::jsonb),
      ('digital_services', 'Digital Services', 'Digital service or SaaS subscription', 'vat', false, '{"scope":"default"}'::jsonb),
      ('professional_services', 'Professional Services', 'Consulting, implementation, or managed service', 'service_tax', false, '{"scope":"default"}'::jsonb)
    ON CONFLICT (code) DO NOTHING;
  `)

  taxTablesReady = true
}

export async function listEffectiveTaxRates(
  countryCode: string,
  stateCode?: string | null,
  productTaxCode?: string | null,
): Promise<TaxRateRecord[]> {
  await ensureTaxTables()

  const rows = await queryMany<TaxRateRecord>(
    `
      SELECT
        id::int AS id,
        country_code AS "countryCode",
        state_code AS "stateCode",
        tax_type AS "taxType",
        name,
        rate_percent::float8 AS "ratePercent",
        inclusive,
        product_tax_code AS "productTaxCode"
      FROM tax_rates
      WHERE country_code = $1
        AND (state_code = $2 OR state_code IS NULL)
        AND (product_tax_code = $3 OR product_tax_code IS NULL)
        AND effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY state_code DESC NULLS LAST, (product_tax_code IS NOT NULL) DESC, rate_percent DESC
    `,
    [countryCode, stateCode ?? null, productTaxCode ?? null],
  )

  return rows
}

export async function createTaxCalculation(input: {
  sourceType: string
  sourceId: string
  userId?: number | null
  countryCode: string
  stateCode?: string | null
  currency: string
  taxableAmount: number
  totalTaxAmount: number
  totalAmount: number
  jurisdictionDetails: Record<string, unknown>
  lineItems: TaxLineItemInput[]
}): Promise<{ id: number }> {
  await ensureTaxTables()

  const calculation = await queryOne<{ id: number }>(
    `
      INSERT INTO tax_calculations (
        source_type,
        source_id,
        user_id,
        country_code,
        state_code,
        currency,
        taxable_amount,
        total_tax_amount,
        total_amount,
        jurisdiction_details,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
      ON CONFLICT (source_type, source_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        country_code = EXCLUDED.country_code,
        state_code = EXCLUDED.state_code,
        currency = EXCLUDED.currency,
        taxable_amount = EXCLUDED.taxable_amount,
        total_tax_amount = EXCLUDED.total_tax_amount,
        total_amount = EXCLUDED.total_amount,
        jurisdiction_details = EXCLUDED.jurisdiction_details,
        updated_at = NOW()
      RETURNING id::int AS id
    `,
    [
      input.sourceType,
      input.sourceId,
      input.userId ?? null,
      input.countryCode,
      input.stateCode ?? null,
      input.currency,
      input.taxableAmount,
      input.totalTaxAmount,
      input.totalAmount,
      JSON.stringify(input.jurisdictionDetails ?? {}),
    ],
  )

  if (!calculation) throw new Error("Failed to store tax calculation")

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
    `DELETE FROM tax_line_items WHERE tax_calculation_id = $1`,
    [calculation.id],
  )

  for (const lineItem of input.lineItems) {
    await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
      `
        INSERT INTO tax_line_items (
          tax_calculation_id,
          tax_rate_id,
          jurisdiction_level,
          jurisdiction_code,
          tax_type,
          tax_name,
          rate_percent,
          taxable_amount,
          tax_amount,
          metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      `,
      [
        calculation.id,
        lineItem.taxRateId ?? null,
        lineItem.jurisdictionLevel,
        lineItem.jurisdictionCode,
        lineItem.taxType,
        lineItem.taxName,
        lineItem.ratePercent,
        lineItem.taxableAmount,
        lineItem.taxAmount,
        JSON.stringify(lineItem.metadata ?? {}),
      ],
    )
  }

  if (input.sourceType === "transaction") {
    await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
      `DELETE FROM transaction_tax_line_items WHERE transaction_id = $1`,
      [input.sourceId],
    )

    for (const lineItem of input.lineItems) {
      await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
        `
          INSERT INTO transaction_tax_line_items (
            transaction_id,
            tax_calculation_id,
            jurisdiction_level,
            jurisdiction_code,
            tax_type,
            tax_name,
            rate_percent,
            taxable_amount,
            tax_amount,
            metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        `,
        [
          input.sourceId,
          calculation.id,
          lineItem.jurisdictionLevel,
          lineItem.jurisdictionCode,
          lineItem.taxType,
          lineItem.taxName,
          lineItem.ratePercent,
          lineItem.taxableAmount,
          lineItem.taxAmount,
          JSON.stringify(lineItem.metadata ?? {}),
        ],
      )
    }
  }

  return calculation
}

export async function listProductTaxClassifications(): Promise<ProductTaxClassificationRecord[]> {
  await ensureTaxTables()
  return queryMany<ProductTaxClassificationRecord>(
    `
      SELECT
        id::int AS id,
        code,
        name,
        description,
        default_tax_type AS "defaultTaxType",
        default_inclusive AS "defaultInclusive",
        metadata
      FROM product_tax_classifications
      ORDER BY name ASC
    `,
  )
}

export async function getTaxLiabilitySummary(input: { from?: Date; to?: Date }) {
  await ensureTaxTables()
  return queryMany<{
    countryCode: string
    stateCode: string | null
    taxAmount: number
    taxableAmount: number
    grossAmount: number
  }>(
    `
      SELECT
        country_code AS "countryCode",
        state_code AS "stateCode",
        COALESCE(SUM(total_tax_amount), 0)::float8 AS "taxAmount",
        COALESCE(SUM(taxable_amount), 0)::float8 AS "taxableAmount",
        COALESCE(SUM(total_amount), 0)::float8 AS "grossAmount"
      FROM tax_calculations
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
      GROUP BY country_code, state_code
      ORDER BY country_code ASC, state_code ASC NULLS LAST
    `,
    [input.from ?? null, input.to ?? null],
  )
}

export async function getTaxBreakdown(input: { from?: Date; to?: Date; limit?: number }) {
  await ensureTaxTables()
  return queryMany<{
    sourceType: string
    sourceId: string
    countryCode: string
    stateCode: string | null
    currency: string
    taxableAmount: number
    taxAmount: number
    totalAmount: number
    createdAt: string
  }>(
    `
      SELECT
        source_type AS "sourceType",
        source_id AS "sourceId",
        country_code AS "countryCode",
        state_code AS "stateCode",
        currency,
        taxable_amount::float8 AS "taxableAmount",
        total_tax_amount::float8 AS "taxAmount",
        total_amount::float8 AS "totalAmount",
        created_at::text AS "createdAt"
      FROM tax_calculations
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [input.from ?? null, input.to ?? null, Math.max(1, Math.min(500, input.limit ?? 200))],
  )
}
