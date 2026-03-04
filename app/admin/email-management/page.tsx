import { EmailManagementDashboard } from "@/components/email/email-management-dashboard"
import { RealTimeEmailDashboard } from "@/components/email/real-time-email-dashboard"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"
import { getEmailSafetyConfig } from "@/lib/email"

export default async function EmailManagementPage() {
  await requireAdminUiRouteAccess("/admin/email-management")

  const safetyConfig = getEmailSafetyConfig()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <RealTimeEmailDashboard />
      <EmailManagementDashboard
        safety={{
          safeMode: safetyConfig.safeMode,
          dryRun: safetyConfig.dryRun,
          testRecipients: safetyConfig.allowlistedRecipients,
          sinkRecipient: safetyConfig.sinkRecipient,
        }}
      />
    </div>
  )
}
