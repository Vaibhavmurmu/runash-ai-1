import { queryOne, sql } from "@/lib/db"

export type PaymentIntentStatus = "pending" | "processing" | "succeeded" | "failed" | "canceled"

export interface PaymentIntentRecord {
  id: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  paymentMethodId: string
  provider: string
  providerIntentId: string | null
  createIdempotencyKey: string
  metadata: Record<string, unknown>
  providerEvents: Array<Record<string, unknown>>
  createdAt: Date
  updatedAt: Date
}

let paymentIntentTableReady = false

async function ensurePaymentIntentTable() {
  if (paymentIntentTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      id TEXT PRIMARY KEY,
      amount NUMERIC(15,2) NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_method_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_intent_id TEXT,
      create_idempotency_key TEXT NOT NULL UNIQUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider_events JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
    CREATE INDEX IF NOT EXISTS idx_payment_intents_provider ON payment_intents(provider);
  `)

  paymentIntentTableReady = true
}

function mapRow(row: {
  id: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  paymentMethodId: string
  provider: string
  providerIntentId: string | null
  createIdempotencyKey: string
  metadata: Record<string, unknown>
  providerEvents: Array<Record<string, unknown>>
  createdAt: Date
  updatedAt: Date
}): PaymentIntentRecord {
  return {
    ...row,
    amount: Number(row.amount),
    metadata: row.metadata ?? {},
    providerEvents: row.providerEvents ?? [],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createPaymentIntentRecord(input: {
  id: string
  amount: number
  currency: string
  paymentMethodId: string
  provider: string
  createIdempotencyKey: string
  metadata: Record<string, unknown>
  providerIntentId?: string | null
  providerEvents?: Array<Record<string, unknown>>
}): Promise<PaymentIntentRecord> {
  await ensurePaymentIntentTable()

  const row = await queryOne<{
    id: string
    amount: number
    currency: string
    status: PaymentIntentStatus
    paymentMethodId: string
    provider: string
    providerIntentId: string | null
    createIdempotencyKey: string
    metadata: Record<string, unknown>
    providerEvents: Array<Record<string, unknown>>
    createdAt: Date
    updatedAt: Date
  }>(
    `
      INSERT INTO payment_intents (
        id, amount, currency, status, payment_method_id, provider,
        provider_intent_id, create_idempotency_key, metadata, provider_events
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8::jsonb, $9::jsonb)
      RETURNING
        id,
        amount::float8 AS amount,
        currency,
        status,
        payment_method_id AS "paymentMethodId",
        provider,
        provider_intent_id AS "providerIntentId",
        create_idempotency_key AS "createIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.amount,
      input.currency,
      input.paymentMethodId,
      input.provider,
      input.providerIntentId ?? null,
      input.createIdempotencyKey,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.providerEvents ?? []),
    ],
  )

  if (!row) throw new Error("Failed to persist payment intent")
  return mapRow(row)
}

export async function getPaymentIntentById(id: string): Promise<PaymentIntentRecord | null> {
  await ensurePaymentIntentTable()
  const row = await queryOne<{
    id: string
    amount: number
    currency: string
    status: PaymentIntentStatus
    paymentMethodId: string
    provider: string
    providerIntentId: string | null
    createIdempotencyKey: string
    metadata: Record<string, unknown>
    providerEvents: Array<Record<string, unknown>>
    createdAt: Date
    updatedAt: Date
  }>(
    `
      SELECT
        id,
        amount::float8 AS amount,
        currency,
        status,
        payment_method_id AS "paymentMethodId",
        provider,
        provider_intent_id AS "providerIntentId",
        create_idempotency_key AS "createIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_intents
      WHERE id = $1
    `,
    [id],
  )

  return row ? mapRow(row) : null
}

export async function getPaymentIntentByCreateIdempotencyKey(key: string): Promise<PaymentIntentRecord | null> {
  await ensurePaymentIntentTable()
  const row = await queryOne<{
    id: string
    amount: number
    currency: string
    status: PaymentIntentStatus
    paymentMethodId: string
    provider: string
    providerIntentId: string | null
    createIdempotencyKey: string
    metadata: Record<string, unknown>
    providerEvents: Array<Record<string, unknown>>
    createdAt: Date
    updatedAt: Date
  }>(
    `
      SELECT
        id,
        amount::float8 AS amount,
        currency,
        status,
        payment_method_id AS "paymentMethodId",
        provider,
        provider_intent_id AS "providerIntentId",
        create_idempotency_key AS "createIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_intents
      WHERE create_idempotency_key = $1
    `,
    [key],
  )

  return row ? mapRow(row) : null
}

export async function updatePaymentIntentStatus(input: {
  id: string
  status: PaymentIntentStatus
  providerIntentId?: string | null
  providerEvent?: Record<string, unknown>
}): Promise<PaymentIntentRecord | null> {
  await ensurePaymentIntentTable()

  const row = await queryOne<{
    id: string
    amount: number
    currency: string
    status: PaymentIntentStatus
    paymentMethodId: string
    provider: string
    providerIntentId: string | null
    createIdempotencyKey: string
    metadata: Record<string, unknown>
    providerEvents: Array<Record<string, unknown>>
    createdAt: Date
    updatedAt: Date
  }>(
    `
      UPDATE payment_intents
      SET
        status = $2,
        provider_intent_id = COALESCE($3, provider_intent_id),
        provider_events = CASE
          WHEN $4::jsonb IS NULL THEN provider_events
          ELSE provider_events || jsonb_build_array($4::jsonb)
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        amount::float8 AS amount,
        currency,
        status,
        payment_method_id AS "paymentMethodId",
        provider,
        provider_intent_id AS "providerIntentId",
        create_idempotency_key AS "createIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.status, input.providerIntentId ?? null, input.providerEvent ? JSON.stringify(input.providerEvent) : null],
  )

  return row ? mapRow(row) : null
}
