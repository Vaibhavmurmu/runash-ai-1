import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

export async function POST(request: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  try {
    const body = await request.json()
    const { intentId, idempotencyKey } = body

    if (!intentId) {
      return NextResponse.json({ error: "Missing required field: intentId" }, { status: 400 })
    }

    const requestIdempotencyKey = idempotencyKey || request.headers.get("x-idempotency-key") || undefined
    const transaction = await PaymentService.processPayment(intentId, requestIdempotencyKey)

    const transactionOwner = String(transaction.metadata?.user_id || "")
    if (!transactionOwner || transactionOwner !== auth.sessionUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await logPrivilegedAction({
      actorUserId: auth.sessionUser.userId,
      action: "payment.intent.confirmed",
      resource: "payment.intent",
      request,
      details: { intentId, transactionId: transaction.id, status: transaction.status },
    })

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch {
    console.error("Payment confirmation failed")
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
}
