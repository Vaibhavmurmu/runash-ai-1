import { queryMany, queryOne, sql } from "@/lib/db"

export type PaymentMethodType = "card" | "upi" | "netbanking" | "wallet" | "bnpl"

export interface PaymentMethodRecord {
  id: string
  name: string
  type: PaymentMethodType
  provider: string
  icon: string
  enabled: boolean
  processingFee: number
  description: string
  supportedCurrencies: string[]
  createdAt: Date
  updatedAt: Date
}

let paymentMethodTableReady = false

async function ensurePaymentMethodTable() {
  if (paymentMethodTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      icon TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      processing_fee NUMERIC(10,4) NOT NULL,
      description TEXT NOT NULL,
      supported_currencies JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_methods_enabled ON payment_methods(enabled);
    CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
  `)

  paymentMethodTableReady = true
}

function mapRow(row: PaymentMethodRecord): PaymentMethodRecord {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    processingFee: Number(row.processingFee),
    supportedCurrencies: Array.isArray(row.supportedCurrencies) ? row.supportedCurrencies : [],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createPaymentMethodRecord(input: {
  id: string
  name: string
  type: PaymentMethodType
  provider: string
  icon: string
  enabled: boolean
  processingFee: number
  description: string
  supportedCurrencies: string[]
}): Promise<PaymentMethodRecord> {
  await ensurePaymentMethodTable()

  const row = await queryOne<PaymentMethodRecord>(
    `
      INSERT INTO payment_methods (
        id, name, type, provider, icon, enabled, processing_fee, description, supported_currencies
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        provider = EXCLUDED.provider,
        icon = EXCLUDED.icon,
        enabled = EXCLUDED.enabled,
        processing_fee = EXCLUDED.processing_fee,
        description = EXCLUDED.description,
        supported_currencies = EXCLUDED.supported_currencies,
        updated_at = NOW()
      RETURNING
        id,
        name,
        type,
        provider,
        icon,
        enabled,
        processing_fee::float8 AS "processingFee",
        description,
        supported_currencies AS "supportedCurrencies",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.name,
      input.type,
      input.provider,
      input.icon,
      input.enabled,
      input.processingFee,
      input.description,
      JSON.stringify(input.supportedCurrencies ?? []),
    ],
  )

  if (!row) throw new Error("Failed to persist payment method")
  return mapRow(row)
}

export async function findPaymentMethodById(id: string): Promise<PaymentMethodRecord | null> {
  await ensurePaymentMethodTable()
  const row = await queryOne<PaymentMethodRecord>(
    `
      SELECT
        id,
        name,
        type,
        provider,
        icon,
        enabled,
        processing_fee::float8 AS "processingFee",
        description,
        supported_currencies AS "supportedCurrencies",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_methods
      WHERE id = $1
    `,
    [id],
  )

  return row ? mapRow(row) : null
}

export async function listEnabledPaymentMethods(currency?: string): Promise<PaymentMethodRecord[]> {
  await ensurePaymentMethodTable()

  const rows = await queryMany<PaymentMethodRecord>(
    `
      SELECT
        id,
        name,
        type,
        provider,
        icon,
        enabled,
        processing_fee::float8 AS "processingFee",
        description,
        supported_currencies AS "supportedCurrencies",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_methods
      WHERE enabled = TRUE
        AND ($1::text IS NULL OR supported_currencies ? $1::text)
      ORDER BY created_at ASC
    `,
    [currency ?? null],
  )

  return rows.map(mapRow)
}
