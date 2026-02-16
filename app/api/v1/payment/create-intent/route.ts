import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { resolveCreateIntentIdempotencyKey } from "@/lib/payment-idempotency"
import { PaymentService } from "@/lib/payment-service"
import { evaluatePaymentValidatorGate } from "@/lib/payments/validator-gate"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import { ingestUsageEvent, type UsageEventIngestionInput } from "@/lib/billing-usage"

function toUsageBillingHook(
  usageHook: Record<string, unknown> | null | undefined,
  sessionUser: { userId: string },
): UsageEventIngestionInput | null {
  if (!usageHook) return null

  const eventId = typeof usageHook.eventId === "string" ? usageHook.eventId : null
  const promptTokens = typeof usageHook.promptTokens === "number" ? usageHook.promptTokens : null
  const completionTokens = typeof usageHook.completionTokens === "number" ? usageHook.completionTokens : null
  const deltaMs = typeof usageHook.deltaMs === "number" ? usageHook.deltaMs : null
  const pricingModel = typeof usageHook.pricingModel === "object" && usageHook.pricingModel !== null ? usageHook.pricingModel : null
  const metadata = typeof usageHook.metadata === "object" && usageHook.metadata !== null ? usageHook.metadata : {}

  if (!eventId || promptTokens == null || completionTokens == null || deltaMs == null || !pricingModel) {
    return null
  }

  return {
    eventId,
    customerId: sessionUser.userId,
    userId: sessionUser.userId,
    promptTokens,
    completionTokens,
    deltaMs,
    pricingModel: pricingModel as UsageEventIngestionInput["pricingModel"],
    metadata: {
      ...(metadata as Record<string, unknown>),
      ingestionSource: "payment_create_intent",
    },
  }
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const body = await request.json()
    const { amount, currency, paymentMethodId, metadata, idempotencyKey, humanConfirmed, mfaVerified, usageHook } = body

    if (!amount || !currency || !paymentMethodId) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required fields: amount, currency, paymentMethodId" }, { status: 400 })
    }

    if (typeof amount !== "number" || amount <= 0) {
      return respondError(request, { code: "INVALID_AMOUNT", message: "Amount must be a positive number" }, { status: 400 })
    }

    const validatorDecision = evaluatePaymentValidatorGate({
      amountMinor: Math.round(amount),
      currency,
      humanConfirmed: Boolean(humanConfirmed),
      mfaVerified: Boolean(mfaVerified),
    })

    if (!validatorDecision.allowed) {
      await logPrivilegedAction({
        actorUserId: sessionUser.userId,
        action: "payment.intent.validator_blocked",
        resource: "payment.intent",
        request,
        details: sanitizePaymentActivityDetails({
          amount,
          currency,
          paymentMethodId,
          validatorDecision,
          metadata: metadata || {},
        }),
      })

      return respondError(
        request,
        {
          code: "PAYMENT_VALIDATOR_BLOCKED",
          message: "Payment blocked pending additional verification",
        },
        {
          status: 403,
          meta: { validatorDecision },
        },
      )
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
      validatorDecision,
      usage_hook_attached: Boolean(usageHook),
    }

    const intent = await PaymentService.createPaymentIntent(
      amount,
      currency,
      paymentMethodId,
      mergedMetadata,
      requestIdempotencyKey,
    )

    const usageEvent = toUsageBillingHook(usageHook, sessionUser)
    let usageHookResult: { accepted: boolean; duplicate?: boolean } | null = null
    if (usageEvent) {
      const usageResult = await ingestUsageEvent(usageEvent)
      usageHookResult = { accepted: usageResult.ingested, duplicate: usageResult.duplicate }
    }

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.intent.created",
      resource: "payment.intent",
      request,
      details: sanitizePaymentActivityDetails({
        amount,
        currency,
        hasPaymentMethodId: Boolean(paymentMethodId),
        paymentMethodId,
        metadata: metadata || {},
        validatorDecision,
      }),
    })

    return respondSuccess(request, {
      ...intent,
      validatorDecision,
      usageHook: usageHookResult,
    })
  } catch (error) {
    logApiRouteError(request, "payment.intent.create_failed", error, { errorCode: "PAYMENT_INTENT_CREATION_FAILED" })
    return respondError(request, { code: "PAYMENT_INTENT_CREATION_FAILED", message: "Failed to create payment intent" }, { status: 500 })
  }
}
