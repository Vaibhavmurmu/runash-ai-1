import { type NextRequest } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"
import { resolveCreateIntentIdempotencyKey } from "@/lib/payment-idempotency"

export async function POST(request: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  try {
    const body = await request.json()
    const { amount, currency, paymentMethodId, metadata, idempotencyKey } = body

    if (!amount || !currency || !paymentMethodId) {
      return respondError(
        request,
        {
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: amount, currency, paymentMethodId",
        },
        {
          status: 400,
          legacy: { error: "Missing required fields: amount, currency, paymentMethodId" },
        },
      )
    }

    if (typeof amount !== "number" || amount <= 0) {
      return respondError(
        request,
        {
          code: "INVALID_AMOUNT",
          message: "Amount must be a positive number",
        },
        {
          status: 400,
          legacy: { error: "Amount must be a positive number" },
        },
      )
    }

    const isValidMethod = await PaymentService.validatePaymentMethod(paymentMethodId, currency)
    if (!isValidMethod) {
      return respondError(
        request,
        {
          code: "INVALID_PAYMENT_METHOD",
          message: "Invalid payment method for the specified currency",
        },
        {
          status: 400,
          legacy: { error: "Invalid payment method for the specified currency" },
        },
      )
    }

    const requestIdempotencyKey = resolveCreateIntentIdempotencyKey({
      providedKey: idempotencyKey || request.headers.get("x-idempotency-key") || undefined,
      userId: auth.sessionUser.userId,
      organizationId: auth.sessionUser.organizationId,
      amount,
      currency,
      paymentMethodId,
      metadata: metadata || {},
    })
    const mergedMetadata = {
      ...(metadata || {}),
      user_id: auth.sessionUser.userId,
      organization_id: auth.sessionUser.organizationId,
    }

    const intent = await PaymentService.createPaymentIntent(
      amount,
      currency,
      paymentMethodId,
      mergedMetadata,
      requestIdempotencyKey,
    )

    await logPrivilegedAction({
      actorUserId: auth.sessionUser.userId,
      action: "payment.intent.created",
      resource: "payment.intent",
      request,
      details: { amount, currency, paymentMethodId },
    })

    return respondSuccess(request, intent, {
      legacy: {
        success: true,
        data: intent,
      },
    })
  } catch (error) {
    logApiRouteError(request, "payment.intent.create_failed", error, { errorCode: "PAYMENT_INTENT_CREATION_FAILED" })
    return respondError(
      request,
      {
        code: "PAYMENT_INTENT_CREATION_FAILED",
        message: "Failed to create payment intent",
      },
      {
        status: 500,
        legacy: { error: "Failed to create payment intent" },
      },
    )
  }
}
