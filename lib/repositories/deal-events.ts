import { queryMany, queryOne, sql } from "@/lib/db"

export interface DealEventRecord {
  id: string
  dealId: string
  eventType: string
  actorRole: string | null
  actorId: string | null
  eventPayload: Record<string, unknown>
  createdAt: Date
}

let dealEventsTableReady = false

async function ensureDealEventsTable() {
  if (dealEventsTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS deal_events (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      actor_role TEXT,
      actor_id TEXT,
      event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  dealEventsTableReady = true
}

function mapRow(row: DealEventRecord): DealEventRecord {
  return {
    ...row,
    eventPayload: row.eventPayload ?? {},
    createdAt: new Date(row.createdAt),
  }
}

export async function createDealEvent(input: {
  id: string
  dealId: string
  eventType: string
  actorRole?: string | null
  actorId?: string | null
  eventPayload?: Record<string, unknown>
}): Promise<DealEventRecord> {
  await ensureDealEventsTable()
  const row = await queryOne<DealEventRecord>(
    `
      INSERT INTO deal_events (id, deal_id, event_type, actor_role, actor_id, event_payload)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING
        id,
        deal_id AS "dealId",
        event_type AS "eventType",
        actor_role AS "actorRole",
        actor_id AS "actorId",
        event_payload AS "eventPayload",
        created_at AS "createdAt"
    `,
    [input.id, input.dealId, input.eventType, input.actorRole ?? null, input.actorId ?? null, JSON.stringify(input.eventPayload ?? {})],
  )

  if (!row) throw new Error("Failed to create deal event")
  return mapRow(row)
}

export async function listDealEvents(dealId: string): Promise<DealEventRecord[]> {
  await ensureDealEventsTable()
  const rows = await queryMany<DealEventRecord>(
    `
      SELECT
        id,
        deal_id AS "dealId",
        event_type AS "eventType",
        actor_role AS "actorRole",
        actor_id AS "actorId",
        event_payload AS "eventPayload",
        created_at AS "createdAt"
      FROM deal_events
      WHERE deal_id = $1
      ORDER BY created_at ASC
    `,
    [dealId],
  )

  return rows.map(mapRow)
}
