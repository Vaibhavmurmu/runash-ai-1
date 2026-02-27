import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Members",
  description: "Manage member access, roles, and collaboration boundaries.",
  path: "/dashboard/members",
})

export default function MembersPage() {
  return (
    <RoutePlanShell
      title="Members"
      description="Manage member access, roles, and collaboration boundaries."
      status="Ready"
      statusSummary="Member management route is active for role and access workflows."
      emptyStateTitle="No members invited"
      emptyStateDescription="Invite contributors and assign workspace roles."
      primaryAction={{ label: "Manage roles", href: "/dashboard/accounting/settings/user-roles" }}
      secondaryAction={{ label: "Open referrals", href: "/dashboard/refer" }}
    />
  )
}
