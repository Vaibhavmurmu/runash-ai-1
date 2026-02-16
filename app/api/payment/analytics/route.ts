import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"
import { getCheckoutAnalyticsSnapshot, getPaymentAnalyticsSummary, listCheckoutAttemptResults } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const scopeError = ensureCustomerScopedAccess(sessionUser, { customerId: sessionUser.userId, organizationId: sessionUser.organizationId })
  if (scopeError) return scopeError

  try {
    const [analytics, checkoutAnalytics, checkoutAttemptResults, paymentAnalyticsSummary] = await Promise.all([
      PaymentService.getAnalytics(),
      getCheckoutAnalyticsSnapshot(sessionUser.userId),
      listCheckoutAttemptResults(sessionUser.userId, 50),
      getPaymentAnalyticsSummary(sessionUser.userId),
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
        paymentAnalyticsSummary,
      },
    })
  } catch (error) {
    logApiRouteError(request, "payment.analytics.fetch_failed", error, { errorCode: "PAYMENT_ANALYTICS_FETCH_FAILED" })
    return NextResponse.json({ error: "Failed to fetch payment analytics" }, { status: 500 })
  }
}
