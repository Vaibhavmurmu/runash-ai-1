import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

export async function GET(request: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "business")
  if (roleResponse) return roleResponse

  try {
    const analytics = await PaymentService.getAnalytics()

    await logPrivilegedAction({
      actorUserId: auth.sessionUser.userId,
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
    console.error("Failed to fetch payment analytics:", error)
    return NextResponse.json({ error: "Failed to fetch payment analytics" }, { status: 500 })
  }
}
