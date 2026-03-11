import { randomUUID } from "crypto"
import { queryMany, queryOne, sql } from "@/lib/db"

export type UpiExecutionStatus = "initiated" | "pending" | "success" | "failed"
export type UpiErrorCode = "INVALID_PIN" | "PIN_ATTEMPTS_EXCEEDED" | "RISK_BLOCKED"

type UpiStoredConfirmationResult = {
  ok: boolean
  status: UpiExecutionStatus
  transactionId?: string
  transactionReference?: string
  updatedAt?: string
  idempotencyKey?: string
  code?: UpiErrorCode
  error?: string
  attemptsRemaining?: number
}

export interface UpiTransactionRecord {
  transactionId: string
  orderId: string | null
  ownerUserId: string | null
  amount: number
  currency: string
  status: UpiExecutionStatus
  transactionReference: string
  providerReference: string | null
  providerStatusReference: string | null
  failureReason: string | null
  failureCode: UpiErrorCode | null
  initiationIdempotencyKey: string
  pinHash: string
  pinAttempts: number
  maxPinAttempts: number
  executionStartedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

let upiTablesReady = false

async function ensureUpiTables() {
  if (upiTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS upi_transactions (
      transaction_id TEXT PRIMARY KEY,
      order_id TEXT,
      owner_user_id TEXT,
      amount NUMERIC(15,2) NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'success', 'failed')),
      transaction_reference TEXT NOT NULL,
      provider_reference TEXT,
      provider_status_reference TEXT,
      failure_reason TEXT,
      failure_code TEXT,
      initiation_idempotency_key TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      pin_attempts INTEGER NOT NULL DEFAULT 0,
      max_pin_attempts INTEGER NOT NULL,
      execution_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS upi_transaction_events (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES upi_transactions(transaction_id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      status TEXT,
      idempotency_key TEXT,
      provider_reference TEXT,
      provider_status_reference TEXT,
      failure_reason TEXT,
      failure_code TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(transaction_id, event_type, idempotency_key)
    );

    CREATE INDEX IF NOT EXISTS idx_upi_transactions_status_created
      ON upi_transactions(status, created_at DESC);

    ALTER TABLE upi_transactions
      ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_upi_txn_events_txn_created
      ON upi_transaction_events(transaction_id, created_at DESC);
  `)

  upiTablesReady = true
}

function mapUpiTransaction(row: UpiTransactionRecord): UpiTransactionRecord {
  return {
    ...row,
    amount: Number(row.amount),
    pinAttempts: Number(row.pinAttempts),
    maxPinAttempts: Number(row.maxPinAttempts),
    executionStartedAt: row.executionStartedAt ? new Date(row.executionStartedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function getUpiTransactionById(transactionId: string): Promise<UpiTransactionRecord | null> {
  await ensureUpiTables()
  const row = await queryOne<UpiTransactionRecord>(
    `
      SELECT
        transaction_id AS "transactionId",
        order_id AS "orderId",
        owner_user_id AS "ownerUserId",
        amount::float8 AS amount,
        currency,
        status,
        transaction_reference AS "transactionReference",
        provider_reference AS "providerReference",
        provider_status_reference AS "providerStatusReference",
        failure_reason AS "failureReason",
        failure_code AS "failureCode",
        initiation_idempotency_key AS "initiationIdempotencyKey",
        pin_hash AS "pinHash",
        pin_attempts AS "pinAttempts",
        max_pin_attempts AS "maxPinAttempts",
        execution_started_at AS "executionStartedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM upi_transactions
      WHERE transaction_id = $1
    `,
    [transactionId],
  )

  return row ? mapUpiTransaction(row) : null
}

export async function getUpiTransactionByInitiationIdempotencyKey(idempotencyKey: string): Promise<UpiTransactionRecord | null> {
  await ensureUpiTables()
  const row = await queryOne<UpiTransactionRecord>(
    `
      SELECT
        transaction_id AS "transactionId",
        order_id AS "orderId",
        owner_user_id AS "ownerUserId",
        amount::float8 AS amount,
        currency,
        status,
        transaction_reference AS "transactionReference",
        provider_reference AS "providerReference",
        provider_status_reference AS "providerStatusReference",
        failure_reason AS "failureReason",
        failure_code AS "failureCode",
        initiation_idempotency_key AS "initiationIdempotencyKey",
        pin_hash AS "pinHash",
        pin_attempts AS "pinAttempts",
        max_pin_attempts AS "maxPinAttempts",
        execution_started_at AS "executionStartedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM upi_transactions
      WHERE initiation_idempotency_key = $1
    `,
    [idempotencyKey],
  )

  return row ? mapUpiTransaction(row) : null
}

export async function createUpiTransaction(input: {
  transactionId: string
  orderId?: string | null
  ownerUserId?: string | null
  amount: number
  currency: string
  transactionReference: string
  initiationIdempotencyKey: string
  pinHash: string
  maxPinAttempts: number
}): Promise<UpiTransactionRecord> {
  await ensureUpiTables()
  const row = await queryOne<UpiTransactionRecord>(
    `
      INSERT INTO upi_transactions (
        transaction_id,
        order_id,
        owner_user_id,
        amount,
        currency,
        status,
        transaction_reference,
        initiation_idempotency_key,
        pin_hash,
        max_pin_attempts
      )
      VALUES ($1, $2, $3, $4, $5, 'initiated', $6, $7, $8, $9)
      RETURNING
        transaction_id AS "transactionId",
        order_id AS "orderId",
        owner_user_id AS "ownerUserId",
        amount::float8 AS amount,
        currency,
        status,
        transaction_reference AS "transactionReference",
        provider_reference AS "providerReference",
        provider_status_reference AS "providerStatusReference",
        failure_reason AS "failureReason",
        failure_code AS "failureCode",
        initiation_idempotency_key AS "initiationIdempotencyKey",
        pin_hash AS "pinHash",
        pin_attempts AS "pinAttempts",
        max_pin_attempts AS "maxPinAttempts",
        execution_started_at AS "executionStartedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.transactionId,
      input.orderId ?? null,
      input.ownerUserId ?? null,
      input.amount,
      input.currency,
      input.transactionReference,
      input.initiationIdempotencyKey,
      input.pinHash,
      input.maxPinAttempts,
    ],
  )

  if (!row) throw new Error("Failed to create UPI transaction")
  return mapUpiTransaction(row)
}

export async function updateUpiTransaction(input: {
  transactionId: string
  status: UpiExecutionStatus
  providerReference?: string | null
  providerStatusReference?: string | null
  failureReason?: string | null
  failureCode?: UpiErrorCode | null
  executionStartedAt?: Date | null
  pinAttempts?: number
}): Promise<UpiTransactionRecord | null> {
  await ensureUpiTables()

  const row = await queryOne<UpiTransactionRecord>(
    `
      UPDATE upi_transactions
      SET
        status = $2,
        provider_reference = COALESCE($3, provider_reference),
        provider_status_reference = COALESCE($4, provider_status_reference),
        failure_reason = $5,
        failure_code = $6,
        execution_started_at = COALESCE($7, execution_started_at),
        pin_attempts = COALESCE($8, pin_attempts),
        updated_at = NOW()
      WHERE transaction_id = $1
      RETURNING
        transaction_id AS "transactionId",
        order_id AS "orderId",
        owner_user_id AS "ownerUserId",
        amount::float8 AS amount,
        currency,
        status,
        transaction_reference AS "transactionReference",
        provider_reference AS "providerReference",
        provider_status_reference AS "providerStatusReference",
        failure_reason AS "failureReason",
        failure_code AS "failureCode",
        initiation_idempotency_key AS "initiationIdempotencyKey",
        pin_hash AS "pinHash",
        pin_attempts AS "pinAttempts",
        max_pin_attempts AS "maxPinAttempts",
        execution_started_at AS "executionStartedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.transactionId,
      input.status,
      input.providerReference ?? null,
      input.providerStatusReference ?? null,
      input.failureReason ?? null,
      input.failureCode ?? null,
      input.executionStartedAt ?? null,
      input.pinAttempts,
    ],
  )

  return row ? mapUpiTransaction(row) : null
}

export async function appendUpiTransactionEvent(input: {
  transactionId: string
  eventType: string
  idempotencyKey?: string
  status?: UpiExecutionStatus
  providerReference?: string | null
  providerStatusReference?: string | null
  failureReason?: string | null
  failureCode?: UpiErrorCode | null
  payload?: Record<string, unknown>
}) {
  await ensureUpiTables()

  return queryOne(
    `
      INSERT INTO upi_transaction_events (
        id,
        transaction_id,
        event_type,
        status,
        idempotency_key,
        provider_reference,
        provider_status_reference,
        failure_reason,
        failure_code,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      ON CONFLICT (transaction_id, event_type, idempotency_key)
      DO UPDATE SET
        status = EXCLUDED.status,
        provider_reference = EXCLUDED.provider_reference,
        provider_status_reference = EXCLUDED.provider_status_reference,
        failure_reason = EXCLUDED.failure_reason,
        failure_code = EXCLUDED.failure_code,
        payload = EXCLUDED.payload
      RETURNING id
    `,
    [
      randomUUID(),
      input.transactionId,
      input.eventType,
      input.status ?? null,
      input.idempotencyKey ?? null,
      input.providerReference ?? null,
      input.providerStatusReference ?? null,
      input.failureReason ?? null,
      input.failureCode ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  )
}

export async function getUpiConfirmationResult(transactionId: string, idempotencyKey: string) {
  await ensureUpiTables()
  const row = await queryOne<{ payload: UpiStoredConfirmationResult }>(
    `
      SELECT payload
      FROM upi_transaction_events
      WHERE transaction_id = $1
        AND event_type = 'confirmation_result'
        AND idempotency_key = $2
      LIMIT 1
    `,
    [transactionId, idempotencyKey],
  )

  return row?.payload ?? null
}


export async function getUpiProviderCompletionResult(transactionId: string, idempotencyKey: string) {
  await ensureUpiTables()
  const row = await queryOne<{ payload: Record<string, unknown> }>(
    `
      SELECT payload
      FROM upi_transaction_events
      WHERE transaction_id = $1
        AND event_type = 'provider_completion'
        AND idempotency_key = $2
      LIMIT 1
    `,
    [transactionId, idempotencyKey],
  )

  return row?.payload ?? null
}

export async function listUpiTransactionEvents(transactionId: string) {
  await ensureUpiTables()
  return queryMany(
    `
      SELECT id, event_type AS "eventType", status, idempotency_key AS "idempotencyKey", payload, created_at AS "createdAt"
      FROM upi_transaction_events
      WHERE transaction_id = $1
      ORDER BY created_at DESC
    `,
    [transactionId],
  )
}
