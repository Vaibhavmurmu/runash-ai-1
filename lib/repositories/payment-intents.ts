import { queryMany, queryOne, sql } from "@/lib/db"
import {
  isNormalizedPaymentState,
  isValidPaymentTransition,
  type NormalizedPaymentState,
} from "@/types/payment-domain"

export type PaymentIntentStatus = NormalizedPaymentState

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
  statusTransitions: Partial<Record<PaymentIntentStatus, string>>
  lastStatusTransitionAt: Date | null
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
      status_transitions JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_status_transition_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS status_transitions JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS last_status_transition_at TIMESTAMPTZ;

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
  statusTransitions: Partial<Record<PaymentIntentStatus, string>>
  lastStatusTransitionAt: Date | null
  createdAt: Date
  updatedAt: Date
}): PaymentIntentRecord {
  return {
    ...row,
    amount: Number(row.amount),
    metadata: row.metadata ?? {},
    providerEvents: row.providerEvents ?? [],
    statusTransitions: normalizeStatusTransitions(row.statusTransitions),
    lastStatusTransitionAt: row.lastStatusTransitionAt ? new Date(row.lastStatusTransitionAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

function normalizeStatusTransitions(input: unknown): Partial<Record<PaymentIntentStatus, string>> {
  if (!input || typeof input !== "object") return {}

  const normalized: Partial<Record<PaymentIntentStatus, string>> = {}
  for (const [status, timestamp] of Object.entries(input as Record<string, unknown>)) {
    if (!isNormalizedPaymentState(status) || typeof timestamp !== "string") continue
    normalized[status] = timestamp
  }

  return normalized
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
    statusTransitions: Partial<Record<PaymentIntentStatus, string>>
    lastStatusTransitionAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>(
    `
      INSERT INTO payment_intents (
        id, amount, currency, status, payment_method_id, provider,
        provider_intent_id, create_idempotency_key, metadata, provider_events, status_transitions, last_status_transition_at
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8::jsonb, $9::jsonb, jsonb_build_object('pending', NOW()::text), NOW())
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
        status_transitions AS "statusTransitions",
        last_status_transition_at AS "lastStatusTransitionAt",
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
    statusTransitions: Partial<Record<PaymentIntentStatus, string>>
    lastStatusTransitionAt: Date | null
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
        status_transitions AS "statusTransitions",
        last_status_transition_at AS "lastStatusTransitionAt",
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
    statusTransitions: Partial<Record<PaymentIntentStatus, string>>
    lastStatusTransitionAt: Date | null
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
        status_transitions AS "statusTransitions",
        last_status_transition_at AS "lastStatusTransitionAt",
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

  const current = await getPaymentIntentById(input.id)
  if (!current) return null

  if (!isValidPaymentTransition(current.status, input.status)) {
    throw new Error(`Invalid payment intent transition: ${current.status} -> ${input.status}`)
  }

  const nextTransitions = normalizeStatusTransitions(current.statusTransitions)
  const transitionChanged = current.status !== input.status
  if (transitionChanged || !nextTransitions[input.status]) {
    nextTransitions[input.status] = new Date().toISOString()
  }

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
    statusTransitions: Partial<Record<PaymentIntentStatus, string>>
    lastStatusTransitionAt: Date | null
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
        status_transitions = $5::jsonb,
        last_status_transition_at = CASE WHEN $6::boolean THEN NOW() ELSE last_status_transition_at END,
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
        status_transitions AS "statusTransitions",
        last_status_transition_at AS "lastStatusTransitionAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.status,
      input.providerIntentId ?? null,
      input.providerEvent ? JSON.stringify(input.providerEvent) : null,
      JSON.stringify(nextTransitions),
      transitionChanged,
    ],
  )

  return row ? mapRow(row) : null
}

export async function listPaymentIntentsForReconciliation(limit: number): Promise<PaymentIntentRecord[]> {
  await ensurePaymentIntentTable()

  const rows = await queryMany<{
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
    statusTransitions: Partial<Record<PaymentIntentStatus, string>>
    lastStatusTransitionAt: Date | null
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
        status_transitions AS "statusTransitions",
        last_status_transition_at AS "lastStatusTransitionAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_intents
      WHERE status IN ('pending', 'processing', 'requires_action', 'incomplete')
      ORDER BY updated_at ASC
      LIMIT $1
    `,
    [Math.max(1, Math.min(limit, 500))],
  )

  return rows.map(mapRow)
}
