import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { resolveCreateIntentIdempotencyKey } from "@/lib/payment-idempotency"
import { PaymentService } from "@/lib/payment-service"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const body = await request.json()
    const { amount, currency, paymentMethodId, metadata, idempotencyKey } = body

    if (!amount || !currency || !paymentMethodId) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required fields: amount, currency, paymentMethodId" }, { status: 400 })
    }

    if (typeof amount !== "number" || amount <= 0) {
      return respondError(request, { code: "INVALID_AMOUNT", message: "Amount must be a positive number" }, { status: 400 })
    }

    const isValidMethod = await PaymentService.validatePaymentMethod(paymentMethodId, currency)
    if (!isValidMethod) {
      return respondError(request, { code: "INVALID_PAYMENT_METHOD", message: "Invalid payment method for the specified currency" }, { status: 400 })
    }

    const requestIdempotencyKey = resolveCreateIntentIdempotencyKey({
      providedKey: idempotencyKey || request.headers.get("x-idempotency-key") || undefined,
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      amount,
      currency,
      paymentMethodId,
      metadata: metadata || {},
    })

    const mergedMetadata = {
      ...(metadata || {}),
      user_id: sessionUser.userId,
      organization_id: sessionUser.organizationId,
    }

    const intent = await PaymentService.createPaymentIntent(
      amount,
      currency,
      paymentMethodId,
      mergedMetadata,
      requestIdempotencyKey,
    )

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.intent.created",
      resource: "payment.intent",
      request,
      details: { amount, currency, hasPaymentMethodId: Boolean(paymentMethodId) },
    })

    return respondSuccess(request, intent)
  } catch (error) {
    logApiRouteError(request, "payment.intent.create_failed", error, { errorCode: "PAYMENT_INTENT_CREATION_FAILED" })
    return respondError(request, { code: "PAYMENT_INTENT_CREATION_FAILED", message: "Failed to create payment intent" }, { status: 500 })
  }
}
