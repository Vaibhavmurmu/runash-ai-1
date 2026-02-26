import { queryMany, queryOne, sql } from "@/lib/db"

export type OfferStatus = "pending" | "accepted" | "rejected" | "expired" | "superseded"

export interface OfferRecord {
  id: string
  dealId: string
  actorRole: "buyer" | "seller" | "broker"
  actorId: string
  amountMinor: number
  discountPercent: number
  status: OfferStatus
  expiresAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

let offersTableReady = false

async function ensureOffersTable() {
  if (offersTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      actor_role TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
      discount_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  offersTableReady = true
}

function mapRow(row: OfferRecord): OfferRecord {
  return {
    ...row,
    amountMinor: Number(row.amountMinor),
    discountPercent: Number(row.discountPercent),
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    metadata: row.metadata ?? {},
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createOffer(input: {
  id: string
  dealId: string
  actorRole: "buyer" | "seller" | "broker"
  actorId: string
  amountMinor: number
  discountPercent: number
  status?: OfferStatus
  expiresAt?: string | null
  metadata?: Record<string, unknown>
}): Promise<OfferRecord> {
  await ensureOffersTable()
  const row = await queryOne<OfferRecord>(
    `
      INSERT INTO offers (id, deal_id, actor_role, actor_id, amount_minor, discount_percent, status, expires_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING
        id,
        deal_id AS "dealId",
        actor_role AS "actorRole",
        actor_id AS "actorId",
        amount_minor AS "amountMinor",
        discount_percent AS "discountPercent",
        status,
        expires_at AS "expiresAt",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.dealId,
      input.actorRole,
      input.actorId,
      Math.max(0, Math.round(input.amountMinor)),
      input.discountPercent,
      input.status ?? "pending",
      input.expiresAt ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  )

  if (!row) throw new Error("Failed to create offer")
  return mapRow(row)
}

export async function updateOfferStatus(input: { offerId: string; status: OfferStatus }): Promise<OfferRecord | null> {
  await ensureOffersTable()
  const row = await queryOne<OfferRecord>(
    `
      UPDATE offers
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        deal_id AS "dealId",
        actor_role AS "actorRole",
        actor_id AS "actorId",
        amount_minor AS "amountMinor",
        discount_percent AS "discountPercent",
        status,
        expires_at AS "expiresAt",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.offerId, input.status],
  )

  return row ? mapRow(row) : null
}

export async function listOffersByDealId(dealId: string): Promise<OfferRecord[]> {
  await ensureOffersTable()
  const rows = await queryMany<OfferRecord>(
    `
      SELECT
        id,
        deal_id AS "dealId",
        actor_role AS "actorRole",
        actor_id AS "actorId",
        amount_minor AS "amountMinor",
        discount_percent AS "discountPercent",
        status,
        expires_at AS "expiresAt",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM offers
      WHERE deal_id = $1
      ORDER BY created_at DESC
    `,
    [dealId],
  )

  return rows.map(mapRow)
}
