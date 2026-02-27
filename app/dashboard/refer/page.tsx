import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Refer & Earn",
  description: "Invite new users and track referral conversions from your workspace.",
  path: "/dashboard/refer",
})

export default function ReferPage() {
  return (
    <RoutePlanShell
      title="Refer & Earn"
      description="Invite new users and track referral conversions from your workspace."
      status="Planned"
      statusSummary="Referral lifecycle wiring is planned for this dashboard module."
      emptyStateTitle="No referrals yet"
      emptyStateDescription="Invite teammates and partners to start earning referral credits."
      primaryAction={{ label: "Invite members", href: "/dashboard/members" }}
      secondaryAction={{ label: "See referral credits", href: "/dashboard/billing" }}
    />
  )
}
