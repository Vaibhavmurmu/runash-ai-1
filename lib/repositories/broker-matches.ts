import { queryMany, queryOne, sql } from "@/lib/db"

export interface BrokerMatchRecord {
  id: string
  dealId: string
  brokerId: string
  settlementAmountMinor: number
  settlementReason: string | null
  status: "proposed" | "accepted" | "rejected"
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

let brokerMatchesReady = false

async function ensureBrokerMatchesTable() {
  if (brokerMatchesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS broker_matches (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      broker_id TEXT NOT NULL,
      settlement_amount_minor BIGINT NOT NULL CHECK (settlement_amount_minor >= 0),
      settlement_reason TEXT,
      status TEXT NOT NULL DEFAULT 'proposed',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  brokerMatchesReady = true
}

function mapRow(row: BrokerMatchRecord): BrokerMatchRecord {
  return {
    ...row,
    settlementAmountMinor: Number(row.settlementAmountMinor),
    metadata: row.metadata ?? {},
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createBrokerMatch(input: {
  id: string
  dealId: string
  brokerId: string
  settlementAmountMinor: number
  settlementReason?: string | null
  status?: "proposed" | "accepted" | "rejected"
  metadata?: Record<string, unknown>
}): Promise<BrokerMatchRecord> {
  await ensureBrokerMatchesTable()
  const row = await queryOne<BrokerMatchRecord>(
    `
      INSERT INTO broker_matches (id, deal_id, broker_id, settlement_amount_minor, settlement_reason, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING
        id,
        deal_id AS "dealId",
        broker_id AS "brokerId",
        settlement_amount_minor AS "settlementAmountMinor",
        settlement_reason AS "settlementReason",
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.dealId,
      input.brokerId,
      Math.max(0, Math.round(input.settlementAmountMinor)),
      input.settlementReason ?? null,
      input.status ?? "proposed",
      JSON.stringify(input.metadata ?? {}),
    ],
  )

  if (!row) throw new Error("Failed to create broker match")
  return mapRow(row)
}

export async function listBrokerMatches(dealId: string): Promise<BrokerMatchRecord[]> {
  await ensureBrokerMatchesTable()
  const rows = await queryMany<BrokerMatchRecord>(
    `
      SELECT
        id,
        deal_id AS "dealId",
        broker_id AS "brokerId",
        settlement_amount_minor AS "settlementAmountMinor",
        settlement_reason AS "settlementReason",
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM broker_matches
      WHERE deal_id = $1
      ORDER BY created_at DESC
    `,
    [dealId],
  )

  return rows.map(mapRow)
}
