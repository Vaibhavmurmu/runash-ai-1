import { queryMany } from "@/lib/db"
import { ensureAccountingCoreReady } from "@/lib/repositories/accounting-core"

export type ReconciliationItem = {
  invoiceNumber: string
  taxPeriod: string
  status: string
  bookTax: number
  gstPortalTax: number
  variance: number
}

export async function listReconciliationItems(taxPeriod?: string, status?: string): Promise<ReconciliationItem[]> {
  await ensureAccountingCoreReady()
  return queryMany<ReconciliationItem>(
    `SELECT invoice_number AS "invoiceNumber", tax_period AS "taxPeriod", status,
      book_tax::float8 AS "bookTax", gst_portal_tax::float8 AS "gstPortalTax",
      (book_tax - gst_portal_tax)::float8 AS variance
     FROM accounting_reconciliation_items
     WHERE ($1::text IS NULL OR tax_period = $1)
       AND ($2::text IS NULL OR status = $2)
     ORDER BY invoice_number ASC`,
    [taxPeriod?.trim() || null, status?.trim() || null],
  )
}
