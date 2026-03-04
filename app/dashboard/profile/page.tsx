import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Profile",
  description: "Review your personal account profile and workspace identity details.",
  path: "/dashboard/profile",
})

export default function ProfilePage() {
  return (
    <RoutePlanShell
      title="Profile"
      description="Review your personal account profile and workspace identity details."
      status="Ready"
      statusSummary="Profile route is active and ready for user-level controls."
      emptyStateTitle="Profile details missing"
      emptyStateDescription="Complete your profile to improve team collaboration and access setup."
      primaryAction={{ label: "Open account", href: "/dashboard/account" }}
      secondaryAction={{ label: "Back to general settings", href: "/dashboard/general" }}
    />
  )
}
