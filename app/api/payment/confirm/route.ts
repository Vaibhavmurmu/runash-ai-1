import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"
import { resolveConfirmIntentIdempotencyKey } from "@/lib/payment-idempotency"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const body = await request.json()
    const { intentId, idempotencyKey } = body

    if (!intentId) {
      return NextResponse.json({ error: "Missing required field: intentId" }, { status: 400 })
    }

    const requestIdempotencyKey = resolveConfirmIntentIdempotencyKey({
      providedKey: idempotencyKey || request.headers.get("x-idempotency-key") || undefined,
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      intentId,
    })
    const transaction = await PaymentService.processPayment(intentId, requestIdempotencyKey)

    const transactionOwner = String(transaction.metadata?.user_id || "")
    if (!transactionOwner || transactionOwner !== sessionUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.intent.confirmed",
      resource: "payment.intent",
      request,
      details: { intentId, transactionId: transaction.id, status: transaction.status },
    })

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    logApiRouteError(request, "payment.intent.confirm_failed", error, { errorCode: "PAYMENT_CONFIRMATION_FAILED" })
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
}
