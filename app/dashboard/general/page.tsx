import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "General Settings",
  description: "Configure default workspace behavior, naming, and regional settings.",
  path: "/dashboard/general",
})

export default function GeneralPage() {
  return (
    <RoutePlanShell
      title="General Settings"
      description="Configure default workspace behavior, naming, and regional settings."
      status="Ready"
      statusSummary="General settings baseline is configured for dashboard route planning."
      emptyStateTitle="No customizations yet"
      emptyStateDescription="Set workspace defaults before inviting additional members."
      primaryAction={{ label: "Set preferences", href: "/dashboard/preferences" }}
      secondaryAction={{ label: "Review profile", href: "/dashboard/profile" }}
    />
  )
}
