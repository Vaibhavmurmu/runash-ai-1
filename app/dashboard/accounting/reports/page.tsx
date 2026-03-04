import type { Metadata } from "next"
import { createDashboardMetadata } from "../../metadata"
import { ReportsClient } from "./_components/reports-client"

export const metadata: Metadata = createDashboardMetadata({
  title: "Financial Reports",
  description: "Generate and view accounting and GST statements.",
  path: "/dashboard/accounting/reports",
})

export default function ReportsPage() {
  return <ReportsClient />
}
