import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Connections",
  description: "Connect external providers and monitor integration health.",
  path: "/dashboard/connections",
})

export default function ConnectionsPage() {
  return (
    <RoutePlanShell
      title="Connections"
      description="Connect external providers and monitor integration health."
      status="In Progress"
      statusSummary="Integration connection status checks are enabled for this route plan."
      emptyStateTitle="No connections configured"
      emptyStateDescription="Connect tools to activate automation and data sync workflows."
      primaryAction={{ label: "Generate API credentials", href: "/dashboard/api" }}
      secondaryAction={{ label: "Integration docs", href: "/dashboard/documentation" }}
    />
  )
}
