import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "API Access",
  description: "Create and manage API credentials for dashboard integrations.",
  path: "/dashboard/api",
})

export default function ApiPage() {
  return (
    <RoutePlanShell
      title="API Access"
      description="Create and manage API credentials for dashboard integrations."
      status="In Progress"
      statusSummary="API credential lifecycle hooks are queued for this module route."
      emptyStateTitle="No API keys generated"
      emptyStateDescription="Generate an API key to connect external workflows and apps."
      primaryAction={{ label: "Set up integrations", href: "/dashboard/connections" }}
      secondaryAction={{ label: "API documentation", href: "/dashboard/documentation" }}
    />
  )
}
