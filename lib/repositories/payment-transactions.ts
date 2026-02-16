import { queryMany, queryOne, sql } from "@/lib/db"

export type PaymentTransactionStatus = "pending" | "processing" | "completed" | "failed" | "refunded"

export interface PaymentTransactionRecord {
  id: string
  intentId: string
  amount: number
  currency: string
  status: PaymentTransactionStatus
  paymentMethod: string
  provider: string
  providerTransactionId: string | null
  providerStatus: string
  processingFee: number
  netAmount: number
  failureReason: string | null
  refundAmount: number | null
  refundReason: string | null
  confirmIdempotencyKey: string
  metadata: Record<string, unknown>
  providerEvents: Array<Record<string, unknown>>
  createdAt: Date
  updatedAt: Date
}

let paymentTransactionTableReady = false

async function ensurePaymentTransactionTable() {
  if (paymentTransactionTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_transactions_v2 (
      id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL UNIQUE,
      amount NUMERIC(15,2) NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_transaction_id TEXT,
      provider_status TEXT NOT NULL,
      processing_fee NUMERIC(15,2) NOT NULL,
      net_amount NUMERIC(15,2) NOT NULL,
      failure_reason TEXT,
      refund_amount NUMERIC(15,2),
      refund_reason TEXT,
      confirm_idempotency_key TEXT NOT NULL UNIQUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider_events JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_txn_v2_status ON payment_transactions_v2(status);
    CREATE INDEX IF NOT EXISTS idx_payment_txn_v2_provider ON payment_transactions_v2(provider);
    CREATE INDEX IF NOT EXISTS idx_payment_txn_v2_created ON payment_transactions_v2(created_at DESC);
  `)

  paymentTransactionTableReady = true
}

function mapRow(row: PaymentTransactionRecord): PaymentTransactionRecord {
  return {
    ...row,
    amount: Number(row.amount),
    processingFee: Number(row.processingFee),
    netAmount: Number(row.netAmount),
    refundAmount: row.refundAmount == null ? null : Number(row.refundAmount),
    metadata: row.metadata ?? {},
    providerEvents: row.providerEvents ?? [],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createPaymentTransactionRecord(input: {
  id: string
  intentId: string
  amount: number
  currency: string
  status: PaymentTransactionStatus
  paymentMethod: string
  provider: string
  providerTransactionId?: string | null
  providerStatus: string
  processingFee: number
  netAmount: number
  failureReason?: string | null
  confirmIdempotencyKey: string
  metadata: Record<string, unknown>
  providerEvents?: Array<Record<string, unknown>>
}): Promise<PaymentTransactionRecord> {
  await ensurePaymentTransactionTable()

  const row = await queryOne<PaymentTransactionRecord>(
    `
      INSERT INTO payment_transactions_v2 (
        id, intent_id, amount, currency, status, payment_method, provider,
        provider_transaction_id, provider_status, processing_fee, net_amount,
        failure_reason, confirm_idempotency_key, metadata, provider_events
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb)
      RETURNING
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.intentId,
      input.amount,
      input.currency,
      input.status,
      input.paymentMethod,
      input.provider,
      input.providerTransactionId ?? null,
      input.providerStatus,
      input.processingFee,
      input.netAmount,
      input.failureReason ?? null,
      input.confirmIdempotencyKey,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.providerEvents ?? []),
    ],
  )

  if (!row) throw new Error("Failed to persist payment transaction")
  return mapRow(row)
}

export async function getPaymentTransactionById(id: string): Promise<PaymentTransactionRecord | null> {
  await ensurePaymentTransactionTable()
  const row = await queryOne<PaymentTransactionRecord>(
    `
      SELECT
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_transactions_v2
      WHERE id = $1
    `,
    [id],
  )

  return row ? mapRow(row) : null
}

export async function getPaymentTransactionByIntentId(intentId: string): Promise<PaymentTransactionRecord | null> {
  await ensurePaymentTransactionTable()
  const row = await queryOne<PaymentTransactionRecord>(
    `
      SELECT
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_transactions_v2
      WHERE intent_id = $1
    `,
    [intentId],
  )

  return row ? mapRow(row) : null
}

export async function getPaymentTransactionByConfirmIdempotencyKey(key: string): Promise<PaymentTransactionRecord | null> {
  await ensurePaymentTransactionTable()
  const row = await queryOne<PaymentTransactionRecord>(
    `
      SELECT
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_transactions_v2
      WHERE confirm_idempotency_key = $1
    `,
    [key],
  )

  return row ? mapRow(row) : null
}

export async function updatePaymentTransaction(input: {
  id: string
  status: PaymentTransactionStatus
  providerStatus: string
  providerTransactionId?: string | null
  failureReason?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  providerEvent?: Record<string, unknown>
}): Promise<PaymentTransactionRecord | null> {
  await ensurePaymentTransactionTable()

  const row = await queryOne<PaymentTransactionRecord>(
    `
      UPDATE payment_transactions_v2
      SET
        status = $2,
        provider_status = $3,
        provider_transaction_id = COALESCE($4, provider_transaction_id),
        failure_reason = $5,
        refund_amount = COALESCE($6, refund_amount),
        refund_reason = COALESCE($7, refund_reason),
        provider_events = CASE
          WHEN $8::jsonb IS NULL THEN provider_events
          ELSE provider_events || jsonb_build_array($8::jsonb)
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.status,
      input.providerStatus,
      input.providerTransactionId ?? null,
      input.failureReason ?? null,
      input.refundAmount ?? null,
      input.refundReason ?? null,
      input.providerEvent ? JSON.stringify(input.providerEvent) : null,
    ],
  )

  return row ? mapRow(row) : null
}

export async function listRecentPaymentTransactions(limit = 10): Promise<PaymentTransactionRecord[]> {
  await ensurePaymentTransactionTable()
  const rows = await queryMany<PaymentTransactionRecord>(
    `
      SELECT
        id,
        intent_id AS "intentId",
        amount::float8 AS amount,
        currency,
        status,
        payment_method AS "paymentMethod",
        provider,
        provider_transaction_id AS "providerTransactionId",
        provider_status AS "providerStatus",
        processing_fee::float8 AS "processingFee",
        net_amount::float8 AS "netAmount",
        failure_reason AS "failureReason",
        refund_amount::float8 AS "refundAmount",
        refund_reason AS "refundReason",
        confirm_idempotency_key AS "confirmIdempotencyKey",
        metadata,
        provider_events AS "providerEvents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_transactions_v2
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit],
  )

  return rows.map(mapRow)
}

export async function getPaymentTransactionMonthlyTrends(monthCount = 6): Promise<Array<{ month: string; revenue: number; transactions: number }>> {
  await ensurePaymentTransactionTable()
  const rows = await queryMany<{ month: string; revenue: number; transactions: number }>(
    `
      SELECT
        to_char(date_trunc('month', created_at), 'Mon YYYY') AS month,
        COALESCE(SUM(net_amount), 0)::float8 AS revenue,
        COUNT(*)::int AS transactions
      FROM payment_transactions_v2
      WHERE status = 'completed'
        AND created_at >= date_trunc('month', NOW()) - (($1::int - 1) * INTERVAL '1 month')
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC
    `,
    [monthCount],
  )

  return rows
}


export async function getRevenueSummary(input: { from?: Date; to?: Date }) {
  await ensurePaymentTransactionTable()
  const row = await queryOne<{
    grossRevenue: number
    netRevenue: number
    processingFees: number
    transactions: number
  }>(
    `
      SELECT
        COALESCE(SUM(amount), 0)::float8 AS "grossRevenue",
        COALESCE(SUM(net_amount), 0)::float8 AS "netRevenue",
        COALESCE(SUM(processing_fee), 0)::float8 AS "processingFees",
        COUNT(*)::int AS transactions
      FROM payment_transactions_v2
      WHERE status IN ('completed', 'refunded')
        AND ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
    `,
    [input.from ?? null, input.to ?? null],
  )

  return row ?? { grossRevenue: 0, netRevenue: 0, processingFees: 0, transactions: 0 }
}

export async function getPayoutsSummary(input: { from?: Date; to?: Date }) {
  await ensurePaymentTransactionTable()
  const row = await queryOne<{
    totalPayoutEligible: number
    payoutCount: number
    refundedAmount: number
  }>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END), 0)::float8 AS "totalPayoutEligible",
        COUNT(*) FILTER (WHERE status = 'completed')::int AS "payoutCount",
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END), 0)::float8 AS "refundedAmount"
      FROM payment_transactions_v2
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
    `,
    [input.from ?? null, input.to ?? null],
  )

  return row ?? { totalPayoutEligible: 0, payoutCount: 0, refundedAmount: 0 }
}

export async function getRevenueTransactions(input: { from?: Date; to?: Date; limit?: number }) {
  await ensurePaymentTransactionTable()
  return queryMany<{
    id: string
    intentId: string
    amount: number
    netAmount: number
    processingFee: number
    estimatedTaxAmount: number
    payoutEligibleAmount: number
    currency: string
    status: string
    metadata: Record<string, unknown>
    transactionTrail: Array<Record<string, unknown>>
    createdAt: string
  }>(
    `
      SELECT
        p.id,
        p.intent_id AS "intentId",
        p.amount::float8 AS amount,
        p.net_amount::float8 AS "netAmount",
        p.processing_fee::float8 AS "processingFee",
        COALESCE(tc.total_tax_amount, 0)::float8 AS "estimatedTaxAmount",
        CASE WHEN p.status = 'completed' THEN p.net_amount::float8 ELSE 0::float8 END AS "payoutEligibleAmount",
        p.currency,
        p.status,
        p.metadata,
        p.provider_events AS "transactionTrail",
        p.created_at::text AS "createdAt"
      FROM payment_transactions_v2 p
      LEFT JOIN tax_calculations tc ON tc.source_type = 'transaction' AND tc.source_id = p.intent_id
      WHERE p.status IN ('completed', 'refunded')
        AND ($1::timestamptz IS NULL OR p.created_at >= $1)
        AND ($2::timestamptz IS NULL OR p.created_at <= $2)
      ORDER BY p.created_at DESC
      LIMIT $3
    `,
    [input.from ?? null, input.to ?? null, Math.max(1, Math.min(500, input.limit ?? 200))],
  )
}

export async function getPayoutVisibility(input: { from?: Date; to?: Date; limit?: number }) {
  await ensurePaymentTransactionTable()
  return queryMany<{
    transactionId: string
    intentId: string
    status: string
    grossAmount: number
    netAmount: number
    payoutEligible: boolean
    refundedAmount: number | null
    createdAt: string
  }>(
    `
      SELECT
        id AS "transactionId",
        intent_id AS "intentId",
        status,
        amount::float8 AS "grossAmount",
        net_amount::float8 AS "netAmount",
        (status = 'completed') AS "payoutEligible",
        refund_amount::float8 AS "refundedAmount",
        created_at::text AS "createdAt"
      FROM payment_transactions_v2
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [input.from ?? null, input.to ?? null, Math.max(1, Math.min(500, input.limit ?? 200))],
  )
}

export async function getRevenueTaxSummary(input: { from?: Date; to?: Date }) {
  await ensurePaymentTransactionTable()
  const row = await queryOne<{
    transactionCount: number
    grossRevenueExcludingTax: number
    taxCollected: number
    grossRevenueIncludingTax: number
    netRevenueAfterFees: number
  }>(
    `
      SELECT
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(COALESCE(tc.taxable_amount, p.amount)), 0)::float8 AS "grossRevenueExcludingTax",
        COALESCE(SUM(COALESCE(tc.total_tax_amount, 0)), 0)::float8 AS "taxCollected",
        COALESCE(SUM(COALESCE(tc.total_amount, p.amount)), 0)::float8 AS "grossRevenueIncludingTax",
        COALESCE(SUM(p.net_amount), 0)::float8 AS "netRevenueAfterFees"
      FROM payment_transactions_v2 p
      LEFT JOIN tax_calculations tc ON tc.source_type = 'transaction' AND tc.source_id = p.intent_id
      WHERE p.status IN ('completed', 'refunded')
        AND ($1::timestamptz IS NULL OR p.created_at >= $1)
        AND ($2::timestamptz IS NULL OR p.created_at <= $2)
    `,
    [input.from ?? null, input.to ?? null],
  )

  return row ?? {
    transactionCount: 0,
    grossRevenueExcludingTax: 0,
    taxCollected: 0,
    grossRevenueIncludingTax: 0,
    netRevenueAfterFees: 0,
  }
}

export async function getOperationsFinanceSummary(input: { from?: Date; to?: Date }) {
  await ensurePaymentTransactionTable()
  const row = await queryOne<{
    payoutEligibleNetAmount: number
    payoutPendingCount: number
    payoutCompletedCount: number
    refundedAmount: number
    taxWithheldForRemittance: number
  }>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.net_amount ELSE 0 END), 0)::float8 AS "payoutEligibleNetAmount",
        COUNT(*) FILTER (WHERE p.status IN ('pending', 'processing'))::int AS "payoutPendingCount",
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS "payoutCompletedCount",
        COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.refund_amount ELSE 0 END), 0)::float8 AS "refundedAmount",
        COALESCE(SUM(CASE WHEN p.status IN ('completed', 'refunded') THEN COALESCE(tc.total_tax_amount, 0) ELSE 0 END), 0)::float8 AS "taxWithheldForRemittance"
      FROM payment_transactions_v2 p
      LEFT JOIN tax_calculations tc ON tc.source_type = 'transaction' AND tc.source_id = p.intent_id
      WHERE ($1::timestamptz IS NULL OR p.created_at >= $1)
        AND ($2::timestamptz IS NULL OR p.created_at <= $2)
    `,
    [input.from ?? null, input.to ?? null],
  )

  return row ?? {
    payoutEligibleNetAmount: 0,
    payoutPendingCount: 0,
    payoutCompletedCount: 0,
    refundedAmount: 0,
    taxWithheldForRemittance: 0,
  }
}
