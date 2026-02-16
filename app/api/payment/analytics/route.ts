import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"
import { getCheckoutAnalyticsSnapshot, listCheckoutAttemptResults } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const [analytics, checkoutAnalytics, checkoutAttemptResults] = await Promise.all([
      PaymentService.getAnalytics(),
      getCheckoutAnalyticsSnapshot(sessionUser.userId),
      listCheckoutAttemptResults(sessionUser.userId, 50),
    ])

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.analytics.viewed",
      resource: "payment.analytics",
      request,
      details: { period: "default", includesCheckoutAttempts: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        checkoutAnalytics,
        checkoutAttemptResults,
      },
    })
  } catch (error) {
    logApiRouteError(request, "payment.analytics.fetch_failed", error, { errorCode: "PAYMENT_ANALYTICS_FETCH_FAILED" })
    return NextResponse.json({ error: "Failed to fetch payment analytics" }, { status: 500 })
  }
}
