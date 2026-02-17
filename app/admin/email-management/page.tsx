import { EmailManagementDashboard } from "@/components/email/email-management-dashboard"
import { RealTimeEmailDashboard } from "@/components/email/real-time-email-dashboard"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"

export default async function EmailManagementPage() {
  await requireAdminUiRouteAccess("/admin/email-management")

  return (
    <div className="container mx-auto py-6 space-y-6">
      <RealTimeEmailDashboard />
      <EmailManagementDashboard />
    </div>
  )
}
