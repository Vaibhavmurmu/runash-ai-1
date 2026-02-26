import { getFinancialReportSummary } from "@/lib/repositories/accounting-reports"

export async function getReportsData() {
  return getFinancialReportSummary()
}
