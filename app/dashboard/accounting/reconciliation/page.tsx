import type { Metadata } from "next"
import { createDashboardMetadata } from "../../metadata"
import { ReconciliationClient } from "./_components/reconciliation-client"

export const metadata: Metadata = createDashboardMetadata({
  title: "GST Reconciliation",
  description: "Match purchase records with GSTR-2A/2B data.",
  path: "/dashboard/accounting/reconciliation",
})

export default function ReconciliationPage() {
  return <ReconciliationClient />
}
