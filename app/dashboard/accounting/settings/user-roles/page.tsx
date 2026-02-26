import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserRoleManagement } from "@/components/user-role-management"
import { UserPermissions } from "@/components/user-permissions"
import { UserInvitations } from "@/components/user-invitations"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "User Role Management",
  description: "Manage user roles and permissions for your organization.",
  path: "/dashboard/accounting/settings/user-roles",
})

export default function UserRoleManagementPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions for your organization</p>
        </div>
        <div className="grid gap-6">
          <UserRoleManagement />
          <div className="grid gap-6 md:grid-cols-2">
            <UserPermissions />
            <UserInvitations />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
