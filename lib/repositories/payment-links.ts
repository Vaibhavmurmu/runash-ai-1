import { queryMany, queryOne, sql } from "@/lib/db"

export interface PaymentLinkRecord {
  id: string
  intentId: string
  url: string
  status: "active" | "expired" | "consumed"
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

let paymentLinksTableReady = false

async function ensurePaymentLinksTable() {
  if (paymentLinksTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_links_v2 (
      id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_links_v2_intent_id ON payment_links_v2(intent_id);
  `)

  paymentLinksTableReady = true
}

function mapRow(row: PaymentLinkRecord): PaymentLinkRecord {
  return {
    ...row,
    metadata: row.metadata ?? {},
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createPaymentLinkRecord(input: {
  id: string
  intentId: string
  url: string
  metadata?: Record<string, unknown>
}): Promise<PaymentLinkRecord> {
  await ensurePaymentLinksTable()
  const row = await queryOne<PaymentLinkRecord>(
    `
      INSERT INTO payment_links_v2 (id, intent_id, url, status, metadata)
      VALUES ($1, $2, $3, 'active', $4::jsonb)
      RETURNING
        id,
        intent_id AS "intentId",
        url,
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.intentId, input.url, JSON.stringify(input.metadata ?? {})],
  )

  if (!row) throw new Error("Failed to persist payment link")
  return mapRow(row)
}

export async function listPaymentLinksByIntentId(intentId: string): Promise<PaymentLinkRecord[]> {
  await ensurePaymentLinksTable()
  const rows = await queryMany<PaymentLinkRecord>(
    `
      SELECT
        id,
        intent_id AS "intentId",
        url,
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payment_links_v2
      WHERE intent_id = $1
      ORDER BY created_at DESC
    `,
    [intentId],
  )

  return rows.map(mapRow)
}
