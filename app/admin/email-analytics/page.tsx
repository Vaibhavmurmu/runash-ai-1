import { EmailAnalyticsDashboard } from "@/components/email/email-analytics-dashboard"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"

export default async function EmailAnalyticsPage() {
  await requireAdminUiRouteAccess("/admin/email-analytics")

  return (
    <div className="container mx-auto py-6">
      <EmailAnalyticsDashboard />
    </div>
  )
}
