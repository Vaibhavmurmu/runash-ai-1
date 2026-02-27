import { queryMany } from "@/lib/db"
import { ensureAccountingCoreReady } from "@/lib/repositories/accounting-core"

export type Counterparty = {
  id: string
  entityType: "client" | "vendor"
  name: string
  gstin: string | null
  outstanding: number
}

export async function listCounterparties(entityType?: "client" | "vendor") {
  await ensureAccountingCoreReady()
  return queryMany<Counterparty>(
    `SELECT id, entity_type AS "entityType", name, gstin, outstanding::float8 AS outstanding
      FROM accounting_counterparties
      WHERE is_active = TRUE
        AND ($1::text IS NULL OR entity_type = $1)
      ORDER BY name ASC`,
    [entityType ?? null],
  )
}
