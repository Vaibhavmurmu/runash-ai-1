import { listCounterparties } from "@/lib/repositories/accounting-counterparties"

export async function getCounterpartiesData(entityType?: "client" | "vendor") {
  return listCounterparties(entityType)
}
