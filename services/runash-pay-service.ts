import { queryMany, queryOne, sql } from "@/lib/db"

export type PaymentRequestStatus = "pending" | "fulfilled" | "cancelled"
export type BillPaymentStatus = "scheduled" | "paid" | "failed"

export interface PaymentRequestRecord {
  id: string
  ownerUserId: string
  payerName: string
  amount: number
  note: string | null
  status: PaymentRequestStatus
  createdAt: Date
  updatedAt: Date
}

export interface BillPaymentRecord {
  id: string
  ownerUserId: string
  billerName: string
  amount: number
  dueDate: string | null
  status: BillPaymentStatus
  createdAt: Date
  updatedAt: Date
}

let runashPayTablesReady = false

async function ensureRunashPayTables() {
  if (runashPayTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS runash_payment_requests (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      payer_name TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      note TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_runash_payment_requests_owner_created
      ON runash_payment_requests(owner_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS runash_bill_payments (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      biller_name TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      due_date DATE,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_runash_bill_payments_owner_created
      ON runash_bill_payments(owner_user_id, created_at DESC);
  `)

  runashPayTablesReady = true
}

function mapPaymentRequest(row: PaymentRequestRecord): PaymentRequestRecord {
  return {
    ...row,
    amount: Number(row.amount),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

function mapBillPayment(row: BillPaymentRecord): BillPaymentRecord {
  return {
    ...row,
    amount: Number(row.amount),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function listPaymentRequests(ownerUserId: string): Promise<PaymentRequestRecord[]> {
  await ensureRunashPayTables()
  const rows = await queryMany<PaymentRequestRecord>(
    `
      SELECT
        id,
        owner_user_id AS "ownerUserId",
        payer_name AS "payerName",
        amount::float8 AS amount,
        note,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM runash_payment_requests
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [ownerUserId],
  )

  return rows.map(mapPaymentRequest)
}

export async function createPaymentRequest(input: {
  id: string
  ownerUserId: string
  payerName: string
  amount: number
  note?: string | null
  status?: PaymentRequestStatus
}): Promise<PaymentRequestRecord> {
  await ensureRunashPayTables()
  const row = await queryOne<PaymentRequestRecord>(
    `
      INSERT INTO runash_payment_requests (id, owner_user_id, payer_name, amount, note, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        owner_user_id AS "ownerUserId",
        payer_name AS "payerName",
        amount::float8 AS amount,
        note,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.ownerUserId, input.payerName, input.amount, input.note ?? null, input.status ?? "pending"],
  )

  if (!row) throw new Error("Failed to create payment request")
  return mapPaymentRequest(row)
}

export async function updatePaymentRequestStatus(input: {
  id: string
  ownerUserId: string
  status: PaymentRequestStatus
}): Promise<PaymentRequestRecord | null> {
  await ensureRunashPayTables()
  const row = await queryOne<PaymentRequestRecord>(
    `
      UPDATE runash_payment_requests
      SET status = $3,
          updated_at = NOW()
      WHERE id = $1
        AND owner_user_id = $2
      RETURNING
        id,
        owner_user_id AS "ownerUserId",
        payer_name AS "payerName",
        amount::float8 AS amount,
        note,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.ownerUserId, input.status],
  )

  return row ? mapPaymentRequest(row) : null
}

export async function listBillPayments(ownerUserId: string): Promise<BillPaymentRecord[]> {
  await ensureRunashPayTables()
  const rows = await queryMany<BillPaymentRecord>(
    `
      SELECT
        id,
        owner_user_id AS "ownerUserId",
        biller_name AS "billerName",
        amount::float8 AS amount,
        due_date::text AS "dueDate",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM runash_bill_payments
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [ownerUserId],
  )

  return rows.map(mapBillPayment)
}

export async function createBillPayment(input: {
  id: string
  ownerUserId: string
  billerName: string
  amount: number
  dueDate?: string | null
  status?: BillPaymentStatus
}): Promise<BillPaymentRecord> {
  await ensureRunashPayTables()
  const row = await queryOne<BillPaymentRecord>(
    `
      INSERT INTO runash_bill_payments (id, owner_user_id, biller_name, amount, due_date, status)
      VALUES ($1, $2, $3, $4, $5::date, $6)
      RETURNING
        id,
        owner_user_id AS "ownerUserId",
        biller_name AS "billerName",
        amount::float8 AS amount,
        due_date::text AS "dueDate",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.ownerUserId, input.billerName, input.amount, input.dueDate ?? null, input.status ?? "scheduled"],
  )

  if (!row) throw new Error("Failed to create bill payment")
  return mapBillPayment(row)
}

export async function updateBillPaymentStatus(input: {
  id: string
  ownerUserId: string
  status: BillPaymentStatus
}): Promise<BillPaymentRecord | null> {
  await ensureRunashPayTables()
  const row = await queryOne<BillPaymentRecord>(
    `
      UPDATE runash_bill_payments
      SET status = $3,
          updated_at = NOW()
      WHERE id = $1
        AND owner_user_id = $2
      RETURNING
        id,
        owner_user_id AS "ownerUserId",
        biller_name AS "billerName",
        amount::float8 AS amount,
        due_date::text AS "dueDate",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.ownerUserId, input.status],
  )

  return row ? mapBillPayment(row) : null
}
