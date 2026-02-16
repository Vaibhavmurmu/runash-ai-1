import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const analytics = await PaymentService.getAnalytics()

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.analytics.viewed",
      resource: "payment.analytics",
      request,
      details: { period: "default" },
    })

    return NextResponse.json({
      success: true,
      data: analytics,
    })
  } catch (error) {
    logApiRouteError(request, "payment.analytics.fetch_failed", error, { errorCode: "PAYMENT_ANALYTICS_FETCH_FAILED" })
    return NextResponse.json({ error: "Failed to fetch payment analytics" }, { status: 500 })
  }
}
