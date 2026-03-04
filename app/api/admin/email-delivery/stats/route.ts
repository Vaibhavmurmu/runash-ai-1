import { type NextRequest, NextResponse } from "next/server"
import { EmailDeliveryTracker } from "@/lib/email-delivery"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getEmailSafetyConfig } from "@/lib/email"
import { getEmailProviderDiagnostics } from "@/lib/email-provider"
import { EmailBounceHandler } from "@/lib/email-bounce-handler"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.delivery.stats.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get("campaign_id") ? Number.parseInt(searchParams.get("campaign_id")!) : undefined
    const template_id = searchParams.get("template_id") ? Number.parseInt(searchParams.get("template_id")!) : undefined
    const date_from = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined
    const date_to = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined

    const [stats, bounceStats] = await Promise.all([
      EmailDeliveryTracker.getDeliveryStats({ campaign_id, template_id, date_from, date_to }),
      EmailBounceHandler.getBounceStats({ date_from, date_to }),
    ])

    return NextResponse.json({
      success: true,
      data: stats,
      bounce: bounceStats,
      debug: {
        provider: getEmailProviderDiagnostics(),
        safetyPolicy: getEmailSafetyConfig(),
      },
    })
  } catch (error) {
    console.error("Error fetching delivery stats:", error)
    return NextResponse.json({ error: "Failed to fetch delivery stats" }, { status: 500 })
  }
}
