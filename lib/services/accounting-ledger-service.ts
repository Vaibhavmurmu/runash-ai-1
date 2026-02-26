import { listChartOfAccounts } from "@/lib/repositories/accounting-chart"
import { getTrialBalance, listLedgerEntries } from "@/lib/repositories/accounting-ledger"

export async function getChartOfAccountsData(search?: string) {
  return listChartOfAccounts(search)
}

export async function getLedgerEntriesData(limit?: number) {
  return listLedgerEntries(limit)
}

export async function getTrialBalanceData() {
  return getTrialBalance()
}
