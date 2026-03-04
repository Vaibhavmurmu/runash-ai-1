import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Preferences",
  description: "Personalize dashboard experience, notifications, and defaults.",
  path: "/dashboard/preferences",
})

export default function PreferencesPage() {
  return (
    <RoutePlanShell
      title="Preferences"
      description="Personalize dashboard experience, notifications, and defaults."
      status="In Progress"
      statusSummary="Preference management controls are being rolled out for this route."
      emptyStateTitle="No saved preferences"
      emptyStateDescription="Apply your preferred defaults for notifications and layout behavior."
      primaryAction={{ label: "Manage connections", href: "/dashboard/connections" }}
      secondaryAction={{ label: "Open general settings", href: "/dashboard/general" }}
    />
  )
}
