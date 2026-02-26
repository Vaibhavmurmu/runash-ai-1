import type { Metadata } from "next"
import { createDashboardMetadata } from "../../metadata"
import { ClientsClient } from "./_components/clients-client"

export const metadata: Metadata = createDashboardMetadata({
  title: "Clients & Vendors",
  description: "Manage your business relationships.",
  path: "/dashboard/accounting/clients",
})

export default function ClientsPage() {
  return <ClientsClient />
}
