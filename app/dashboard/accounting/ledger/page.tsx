import type { Metadata } from "next"
import { createDashboardMetadata } from "../../metadata"
import { LedgerClient } from "./_components/ledger-client"

export const metadata: Metadata = createDashboardMetadata({
  title: "Ledger",
  description: "Manage chart of accounts and ledger entries.",
  path: "/dashboard/accounting/ledger",
})

export default function LedgerPage() {
  return <LedgerClient />
}
