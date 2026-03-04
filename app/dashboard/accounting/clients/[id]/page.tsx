import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { ClientDetails } from "@/components/client-details"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Client Details",
  description: "View detailed information about your client.",
  path: "/dashboard/accounting/clients/[id]",
})

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const resolvedParams = await params

  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Details</h1>
          <p className="text-muted-foreground">View detailed information about your client</p>
        </div>
        <ClientDetails clientId={resolvedParams.id} />
      </div>
    </DashboardShell>
  )
}
