import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Usage",
  description: "Track workspace consumption, quotas, and operational usage trends.",
  path: "/dashboard/usage",
})

export default function UsagePage() {
  return (
    <RoutePlanShell
      title="Usage"
      description="Track workspace consumption, quotas, and operational usage trends."
      status="Ready"
      statusSummary="Usage summaries are available for this dashboard route plan."
      emptyStateTitle="No usage events yet"
      emptyStateDescription="Usage metrics will appear after activity starts across modules."
      primaryAction={{ label: "View analytics", href: "/dashboard/analytics" }}
      secondaryAction={{ label: "Review billing", href: "/dashboard/billing" }}
    />
  )
}
