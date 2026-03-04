import { queryMany, queryOne, sql } from "@/lib/db"

export interface DiscountPolicyRecord {
  id: string
  tenantId: string
  sku: string | null
  roleScope: string
  autoAcceptThresholdPercent: number
  autoRejectThresholdPercent: number
  settlementFloorPercent: number
  settlementCeilingPercent: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

let discountPoliciesReady = false

async function ensureDiscountPoliciesTable() {
  if (discountPoliciesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS discount_policies (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      sku TEXT,
      role_scope TEXT NOT NULL DEFAULT 'all',
      auto_accept_threshold_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
      auto_reject_threshold_percent NUMERIC(7,4) NOT NULL DEFAULT 100,
      settlement_floor_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
      settlement_ceiling_percent NUMERIC(7,4) NOT NULL DEFAULT 100,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  discountPoliciesReady = true
}

function mapRow(row: DiscountPolicyRecord): DiscountPolicyRecord {
  return {
    ...row,
    autoAcceptThresholdPercent: Number(row.autoAcceptThresholdPercent),
    autoRejectThresholdPercent: Number(row.autoRejectThresholdPercent),
    settlementFloorPercent: Number(row.settlementFloorPercent),
    settlementCeilingPercent: Number(row.settlementCeilingPercent),
    isActive: Boolean(row.isActive),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

export async function createDiscountPolicy(input: {
  id: string
  tenantId: string
  sku?: string | null
  roleScope?: string
  autoAcceptThresholdPercent: number
  autoRejectThresholdPercent: number
  settlementFloorPercent?: number
  settlementCeilingPercent?: number
  isActive?: boolean
}): Promise<DiscountPolicyRecord> {
  await ensureDiscountPoliciesTable()
  const row = await queryOne<DiscountPolicyRecord>(
    `
      INSERT INTO discount_policies (
        id,
        tenant_id,
        sku,
        role_scope,
        auto_accept_threshold_percent,
        auto_reject_threshold_percent,
        settlement_floor_percent,
        settlement_ceiling_percent,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        tenant_id AS "tenantId",
        sku,
        role_scope AS "roleScope",
        auto_accept_threshold_percent AS "autoAcceptThresholdPercent",
        auto_reject_threshold_percent AS "autoRejectThresholdPercent",
        settlement_floor_percent AS "settlementFloorPercent",
        settlement_ceiling_percent AS "settlementCeilingPercent",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.tenantId,
      input.sku ?? null,
      input.roleScope ?? "all",
      input.autoAcceptThresholdPercent,
      input.autoRejectThresholdPercent,
      input.settlementFloorPercent ?? 0,
      input.settlementCeilingPercent ?? 100,
      input.isActive ?? true,
    ],
  )

  if (!row) throw new Error("Failed to create discount policy")
  return mapRow(row)
}

export async function resolveDiscountPolicy(tenantId: string, sku?: string): Promise<DiscountPolicyRecord | null> {
  await ensureDiscountPoliciesTable()
  const rows = await queryMany<DiscountPolicyRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        sku,
        role_scope AS "roleScope",
        auto_accept_threshold_percent AS "autoAcceptThresholdPercent",
        auto_reject_threshold_percent AS "autoRejectThresholdPercent",
        settlement_floor_percent AS "settlementFloorPercent",
        settlement_ceiling_percent AS "settlementCeilingPercent",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM discount_policies
      WHERE tenant_id = $1
        AND is_active = TRUE
        AND (sku = $2 OR sku IS NULL)
      ORDER BY CASE WHEN sku = $2 THEN 0 ELSE 1 END, updated_at DESC
      LIMIT 1
    `,
    [tenantId, sku ?? null],
  )

  return rows[0] ? mapRow(rows[0]) : null
}
