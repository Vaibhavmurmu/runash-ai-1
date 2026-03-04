import { listReconciliationItems } from "@/lib/repositories/accounting-reconciliation"

export async function getReconciliationData(taxPeriod?: string, status?: string) {
  return listReconciliationItems(taxPeriod, status)
}
