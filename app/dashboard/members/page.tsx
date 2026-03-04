import type { Metadata } from "next"
import { ActionGrid, PageHeader, SectionShell, StatusCard } from "@/components/dashboard/workspace/common/page-primitives"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Members",
  description: "Manage member access, roles, and collaboration boundaries.",
  path: "/dashboard/members",
})

export default function MembersPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        eyebrow="Workspace modules"
        title="Members"
        description="Manage member access, roles, and collaboration boundaries."
      />

      <SectionShell title="Workspace state patterns" description="Shared state behavior across membership and role-management flows.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard kind="loading" title="Loading member directory" description="Fetching invitations, active users, and role assignments." />
          <StatusCard
            kind="empty"
            title="No members invited"
            description="Invite collaborators so they can access projects with scoped permissions."
            action={{ href: "/dashboard/refer", label: "Invite teammates" }}
          />
          <StatusCard
            kind="error"
            title="Role update failed"
            description="We could not save role changes. Retry after reviewing permission settings."
            action={{ href: "/dashboard/accounting/settings/user-roles", label: "Manage roles" }}
          />
          <StatusCard
            kind="success"
            title="Membership synced"
            description="Team access and role boundaries are healthy and up to date."
            action={{ href: "/dashboard/accounting/settings/user-roles", label: "Review user roles" }}
          />
        </div>
      </SectionShell>

      <SectionShell title="Member actions" description="Essential controls for invitation and role governance.">
        <ActionGrid
          items={[
            {
              title: "Role governance",
              description: "Define user permissions and update role responsibilities.",
              href: "/dashboard/accounting/settings/user-roles",
              cta: "Manage roles",
            },
            {
              title: "Invite workflow",
              description: "Use referral and invite links to grow your workspace team.",
              href: "/dashboard/refer",
              cta: "Open referrals",
            },
          ]}
        />
      </SectionShell>
    </div>
  )
}
