import { queryMany, queryOne, sql } from "@/lib/db"

export type DealState = "open" | "accepted" | "rejected" | "expired" | "settled"

export interface DealRecord {
  id: string
  tenantId: string
  buyerId: string
  sellerId: string
  brokerId: string | null
  sku: string
  quantity: number
  currency: string
  listPriceMinor: number
  finalPriceMinor: number | null
  discountBasis: string
  state: DealState
  expiresAt: Date | null
  acceptedOfferId: string | null
  acceptedSnapshot: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

let dealsTableReady = false

async function ensureDealsTable() {
  if (dealsTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      broker_id TEXT,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      currency TEXT NOT NULL DEFAULT 'USD',
      list_price_minor BIGINT NOT NULL CHECK (list_price_minor >= 0),
      final_price_minor BIGINT,
      discount_basis TEXT NOT NULL DEFAULT 'none',
      state TEXT NOT NULL DEFAULT 'open',
      expires_at TIMESTAMPTZ,
      accepted_offer_id TEXT,
      accepted_snapshot JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  dealsTableReady = true
}

function mapRow(row: DealRecord): DealRecord {
  return {
    ...row,
    quantity: Number(row.quantity),
    listPriceMinor: Number(row.listPriceMinor),
    finalPriceMinor: row.finalPriceMinor == null ? null : Number(row.finalPriceMinor),
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    acceptedSnapshot: row.acceptedSnapshot ?? null,
  }
}

export async function createDeal(input: {
  id: string
  tenantId: string
  buyerId: string
  sellerId: string
  brokerId?: string | null
  sku: string
  quantity: number
  currency?: string
  listPriceMinor: number
  discountBasis?: string
  expiresAt?: string | null
}): Promise<DealRecord> {
  await ensureDealsTable()
  const row = await queryOne<DealRecord>(
    `
      INSERT INTO deals (
        id,
        tenant_id,
        buyer_id,
        seller_id,
        broker_id,
        sku,
        quantity,
        currency,
        list_price_minor,
        discount_basis,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        tenant_id AS "tenantId",
        buyer_id AS "buyerId",
        seller_id AS "sellerId",
        broker_id AS "brokerId",
        sku,
        quantity,
        currency,
        list_price_minor AS "listPriceMinor",
        final_price_minor AS "finalPriceMinor",
        discount_basis AS "discountBasis",
        state,
        expires_at AS "expiresAt",
        accepted_offer_id AS "acceptedOfferId",
        accepted_snapshot AS "acceptedSnapshot",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.tenantId,
      input.buyerId,
      input.sellerId,
      input.brokerId ?? null,
      input.sku,
      Math.max(1, Math.round(input.quantity)),
      (input.currency ?? "USD").toUpperCase(),
      Math.max(0, Math.round(input.listPriceMinor)),
      input.discountBasis ?? "none",
      input.expiresAt ?? null,
    ],
  )

  if (!row) throw new Error("Failed to create deal")
  return mapRow(row)
}

export async function getDealById(id: string): Promise<DealRecord | null> {
  await ensureDealsTable()
  const row = await queryOne<DealRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        buyer_id AS "buyerId",
        seller_id AS "sellerId",
        broker_id AS "brokerId",
        sku,
        quantity,
        currency,
        list_price_minor AS "listPriceMinor",
        final_price_minor AS "finalPriceMinor",
        discount_basis AS "discountBasis",
        state,
        expires_at AS "expiresAt",
        accepted_offer_id AS "acceptedOfferId",
        accepted_snapshot AS "acceptedSnapshot",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM deals
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  return row ? mapRow(row) : null
}

export async function updateDealResolution(input: {
  dealId: string
  state: DealState
  finalPriceMinor?: number | null
  acceptedOfferId?: string | null
  acceptedSnapshot?: Record<string, unknown> | null
  discountBasis?: string
}): Promise<DealRecord | null> {
  await ensureDealsTable()
  const row = await queryOne<DealRecord>(
    `
      UPDATE deals
      SET state = $2,
          final_price_minor = $3,
          accepted_offer_id = $4,
          accepted_snapshot = $5::jsonb,
          discount_basis = COALESCE($6, discount_basis),
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        tenant_id AS "tenantId",
        buyer_id AS "buyerId",
        seller_id AS "sellerId",
        broker_id AS "brokerId",
        sku,
        quantity,
        currency,
        list_price_minor AS "listPriceMinor",
        final_price_minor AS "finalPriceMinor",
        discount_basis AS "discountBasis",
        state,
        expires_at AS "expiresAt",
        accepted_offer_id AS "acceptedOfferId",
        accepted_snapshot AS "acceptedSnapshot",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.dealId,
      input.state,
      input.finalPriceMinor == null ? null : Math.max(0, Math.round(input.finalPriceMinor)),
      input.acceptedOfferId ?? null,
      JSON.stringify(input.acceptedSnapshot ?? null),
      input.discountBasis ?? null,
    ],
  )

  return row ? mapRow(row) : null
}

export async function listDealsByTenant(tenantId: string): Promise<DealRecord[]> {
  await ensureDealsTable()
  const rows = await queryMany<DealRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        buyer_id AS "buyerId",
        seller_id AS "sellerId",
        broker_id AS "brokerId",
        sku,
        quantity,
        currency,
        list_price_minor AS "listPriceMinor",
        final_price_minor AS "finalPriceMinor",
        discount_basis AS "discountBasis",
        state,
        expires_at AS "expiresAt",
        accepted_offer_id AS "acceptedOfferId",
        accepted_snapshot AS "acceptedSnapshot",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM deals
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [tenantId],
  )

  return rows.map(mapRow)
}
