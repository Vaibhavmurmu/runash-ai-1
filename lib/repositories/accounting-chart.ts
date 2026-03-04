import { queryMany } from "@/lib/db"
import { ensureAccountingCoreReady } from "@/lib/repositories/accounting-core"

export type AccountingChartAccount = {
  code: string
  name: string
  accountType: string
  currency: string
  balance: number
}

export async function listChartOfAccounts(search?: string): Promise<AccountingChartAccount[]> {
  await ensureAccountingCoreReady()
  return queryMany<AccountingChartAccount>(
    `SELECT code, name, account_type AS "accountType", currency, balance::float8 AS balance
     FROM accounting_chart_of_accounts
     WHERE is_active = TRUE
       AND ($1::text IS NULL OR code ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%')
     ORDER BY code ASC`,
    [search?.trim() || null],
  )
}
