import { queryMany, queryOne } from "@/lib/db"
import { ensureAccountingCoreReady } from "@/lib/repositories/accounting-core"

export type LedgerEntry = {
  entryDate: string
  voucherCode: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
}

export type TrialBalanceRow = {
  account: string
  debit: number
  credit: number
}

export async function listLedgerEntries(limit = 200): Promise<LedgerEntry[]> {
  await ensureAccountingCoreReady()
  const rowLimit = Math.max(1, Math.min(limit, 500))
  return queryMany<LedgerEntry>(
    `SELECT e.entry_date::text AS "entryDate", e.voucher_code AS "voucherCode", e.account_code AS "accountCode", a.name AS "accountName",
      e.debit::float8 AS debit, e.credit::float8 AS credit
     FROM accounting_ledger_entries e
     INNER JOIN accounting_chart_of_accounts a ON a.code = e.account_code
     ORDER BY e.entry_date DESC, e.voucher_code ASC
     LIMIT $1`,
    [rowLimit],
  )
}

export async function getTrialBalance(): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
  await ensureAccountingCoreReady()
  const rows = await queryMany<TrialBalanceRow>(
    `SELECT a.name AS account,
      SUM(e.debit)::float8 AS debit,
      SUM(e.credit)::float8 AS credit
     FROM accounting_ledger_entries e
     INNER JOIN accounting_chart_of_accounts a ON a.code = e.account_code
     GROUP BY a.name
     ORDER BY a.name ASC`,
  )

  const totals = await queryOne<{ totalDebit: number; totalCredit: number }>(
    `SELECT COALESCE(SUM(debit), 0)::float8 AS "totalDebit", COALESCE(SUM(credit), 0)::float8 AS "totalCredit"
     FROM accounting_ledger_entries`,
  )

  return {
    rows,
    totalDebit: totals?.totalDebit ?? 0,
    totalCredit: totals?.totalCredit ?? 0,
  }
}
