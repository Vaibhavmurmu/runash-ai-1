import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { resolveConfirmIntentIdempotencyKey } from "@/lib/payment-idempotency"
import { PaymentService } from "@/lib/payment-service"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import { getPaymentIntentById } from "@/lib/repositories/payment-intents"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const body = await request.json()
    const { intentId, idempotencyKey, humanConfirmed, mfaVerified } = body

    if (!intentId) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required field: intentId" }, { status: 400 })
    }

    const persistedIntent = await getPaymentIntentById(intentId)
    if (!persistedIntent) {
      return respondError(request, { code: "PAYMENT_INTENT_NOT_FOUND", message: "Payment intent not found" }, { status: 404 })
    }

    const metadata = (persistedIntent.metadata ?? {}) as Record<string, unknown>
    const validatorGate = enforcePaymentValidatorMiddleware({
      amountMinor: Math.round(persistedIntent.amount),
      currency: persistedIntent.currency,
      humanConfirmed:
        typeof humanConfirmed === "boolean"
          ? humanConfirmed
          : typeof metadata.human_confirmed === "boolean"
            ? metadata.human_confirmed
            : false,
      mfaVerified:
        typeof mfaVerified === "boolean"
          ? mfaVerified
          : typeof metadata.mfa_verified === "boolean"
            ? metadata.mfa_verified
            : false,
    })

    const validatorDecision = validatorGate.decision

    if (!validatorGate.allowed) {
      await logPrivilegedAction({
        actorUserId: sessionUser.userId,
        action: "payment.intent.confirm_validator_blocked",
        resource: "payment.intent",
        request,
        details: sanitizePaymentActivityDetails({
          intentId,
          validatorDecision,
          validatorGate,
        }),
      })

      return respondError(
        request,
        { code: "PAYMENT_VALIDATOR_BLOCKED", message: "Payment blocked pending additional verification" },
        { status: 403, meta: { validatorDecision, validatorGate } },
      )
    }

    const requestIdempotencyKey = resolveConfirmIntentIdempotencyKey({
      providedKey: idempotencyKey || request.headers.get("x-idempotency-key") || undefined,
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      intentId,
    })

    const executionResult = await PaymentService.processPayment(intentId, requestIdempotencyKey, {
      humanConfirmed: typeof humanConfirmed === "boolean" ? humanConfirmed : undefined,
      mfaVerified: typeof mfaVerified === "boolean" ? mfaVerified : undefined,
    })
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
      details: sanitizePaymentActivityDetails({ intentId, transactionId: transaction.id, status: transaction.status, validatorDecision }),
    })

    return respondSuccess(request, {
      ...transaction,
      attemptedMethods: executionResult.attemptedMethods,
      fallbackUsed: executionResult.fallbackUsed,
      finalStatus: executionResult.finalStatus,
      validatorDecision,
      validatorGate,
    })
  } catch (error) {
    logApiRouteError(request, "payment.intent.confirm_failed", error, { errorCode: "PAYMENT_CONFIRMATION_FAILED" })
    return respondError(request, { code: "PAYMENT_CONFIRMATION_FAILED", message: "Failed to confirm payment" }, { status: 500 })
  }
}
