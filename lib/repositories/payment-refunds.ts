import { queryMany, queryOne, sql } from "@/lib/db"

export interface PaymentRefundRecord {
  id: string
  transactionId: string
  amount: number
  reason: string
  status: "pending" | "succeeded" | "failed"
  providerRefundId: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

let paymentRefundTableReady = false

async function ensurePaymentRefundTable() {
  if (paymentRefundTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_refunds (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_refund_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_refunds_transaction ON payment_refunds(transaction_id);
  `)

  paymentRefundTableReady = true
}

function mapRow(row: PaymentRefundRecord): PaymentRefundRecord {
  return {
    ...row,
    amount: Number(row.amount),
    metadata: row.metadata ?? {},
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createPaymentRefundRecord(input: {
  id: string
  transactionId: string
  amount: number
  reason: string
  status: "pending" | "succeeded" | "failed"
  providerRefundId?: string | null
  metadata?: Record<string, unknown>
}): Promise<PaymentRefundRecord> {
  await ensurePaymentRefundTable()

  const row = await queryOne<PaymentRefundRecord>(
    `
      INSERT INTO payment_refunds (
        id, transaction_id, amount, reason, status, provider_refund_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING
        id,
        transaction_id AS "transactionId",
        amount::float8 AS amount,
        reason,
        status,
        provider_refund_id AS "providerRefundId",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.transactionId,
      input.amount,
      input.reason,
      input.status,
      input.providerRefundId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  )

  if (!row) throw new Error("Failed to persist payment refund")
  return mapRow(row)
}

export async function listRefundsByTransactionId(transactionId: string): Promise<PaymentRefundRecord[]> {
  await ensurePaymentRefundTable()
  const rows = await queryMany<PaymentRefundRecord>(
    `
      SELECT
        id,
        transaction_id AS "transactionId",
        amount::float8 AS amount,
        reason,
        status,
        provider_refund_id AS "providerRefundId",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_refunds
      WHERE transaction_id = $1
      ORDER BY created_at DESC
    `,
    [transactionId],
  )

  return rows.map(mapRow)
}
