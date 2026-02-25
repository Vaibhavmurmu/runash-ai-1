import { Database } from "@/lib/database"

export async function ensureInvoiceSupportTables() {
  await Database.query(`
    CREATE TABLE IF NOT EXISTS invoice_customer_details (
      invoice_id INTEGER PRIMARY KEY REFERENCES invoices(id) ON DELETE CASCADE,
      customer_reference TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await Database.query(`
    CREATE TABLE IF NOT EXISTS invoice_payment_attempts (
      id TEXT PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_reference TEXT,
      status TEXT NOT NULL,
      amount NUMERIC(15,2),
      currency TEXT,
      failure_reason TEXT,
      event_source TEXT NOT NULL,
      source_event_id TEXT,
      source_event_created_at TIMESTAMPTZ,
      checkout_session_id TEXT,
      dedupe_key TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await Database.query(`
    CREATE INDEX IF NOT EXISTS idx_invoice_payment_attempts_invoice ON invoice_payment_attempts(invoice_id, occurred_at DESC)
  `)



  await Database.query(`
    CREATE INDEX IF NOT EXISTS idx_invoice_payment_attempts_provider_ref ON invoice_payment_attempts(provider_reference)
  `)

  await Database.query(`
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS source_event_id TEXT
  `)

  await Database.query(`
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS source_event_created_at TIMESTAMPTZ
  `)

  await Database.query(`
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS checkout_session_id TEXT
  `)

  await Database.query(`
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS dedupe_key TEXT
  `)

  await Database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payment_attempts_dedupe_key
    ON invoice_payment_attempts(dedupe_key)
  `)

  await Database.query(`
    CREATE INDEX IF NOT EXISTS idx_invoice_payment_attempts_checkout_session
    ON invoice_payment_attempts(checkout_session_id, occurred_at DESC)
  `)
}

export async function syncInvoiceStatusFromAttempts(invoiceId: string | number) {
  const result = await Database.query<{ status: string; amount_paid: string | number | null }>(
    `
      WITH latest AS (
        SELECT status, amount
        FROM invoice_payment_attempts
        WHERE invoice_id = $1
        ORDER BY COALESCE(source_event_created_at, occurred_at, created_at) DESC, created_at DESC
        LIMIT 1
      )
      UPDATE invoices i
      SET status = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN 'paid'
            WHEN latest.status IN ('failed', 'payment_failed') THEN CASE WHEN i.due_date IS NOT NULL AND i.due_date < NOW() THEN 'uncollectible' ELSE 'open' END
            ELSE i.status
          END,
          amount_paid = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN COALESCE(ROUND(latest.amount * 100)::INTEGER, i.amount_paid)
            ELSE i.amount_paid
          END,
          paid_at = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN COALESCE(i.paid_at, NOW())
            WHEN latest.status IN ('failed', 'payment_failed') THEN NULL
            ELSE i.paid_at
          END
      FROM latest
      WHERE i.id = $1
      RETURNING i.status, i.amount_paid
    `,
    [invoiceId],
  )

  return result[0] ?? null
}
