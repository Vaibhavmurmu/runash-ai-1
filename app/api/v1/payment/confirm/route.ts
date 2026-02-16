import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { resolveConfirmIntentIdempotencyKey } from "@/lib/payment-idempotency"
import { PaymentService } from "@/lib/payment-service"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const body = await request.json()
    const { intentId, idempotencyKey } = body

    if (!intentId) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required field: intentId" }, { status: 400 })
    }

    const requestIdempotencyKey = resolveConfirmIntentIdempotencyKey({
      providedKey: idempotencyKey || request.headers.get("x-idempotency-key") || undefined,
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      intentId,
    })

    const executionResult = await PaymentService.processPayment(intentId, requestIdempotencyKey)
    const transaction = executionResult.transaction
    const transactionOwner = String(transaction.metadata?.user_id || "")

    if (!transactionOwner || transactionOwner !== sessionUser.userId) {
      return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403 })
    }

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.intent.confirmed",
      resource: "payment.intent",
      request,
      details: { intentId, transactionId: transaction.id, status: transaction.status },
    })

    return respondSuccess(request, {
      ...transaction,
      attemptedMethods: executionResult.attemptedMethods,
      fallbackUsed: executionResult.fallbackUsed,
      finalStatus: executionResult.finalStatus,
    })
  } catch (error) {
    logApiRouteError(request, "payment.intent.confirm_failed", error, { errorCode: "PAYMENT_CONFIRMATION_FAILED" })
    return respondError(request, { code: "PAYMENT_CONFIRMATION_FAILED", message: "Failed to confirm payment" }, { status: 500 })
  }
}
