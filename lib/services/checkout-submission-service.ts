import { createCheckoutLink, createCheckoutSessionRecord, recordCheckoutAttemptResult, updateCheckoutSessionStatus } from "@/services/payment-checkout-profile-service"
import type { CheckoutOrderDTO } from "@/lib/types/checkout-order"

type FetchFn = typeof fetch

interface SubmitCheckoutInput {
  order: CheckoutOrderDTO
  customerId: string
  origin: string
  cookieHeader?: string | null
  userAgent?: string | null
}

interface SubmitCheckoutDependencies {
  fetchImpl?: FetchFn
  createCheckoutLinkFn?: typeof createCheckoutLink
  createCheckoutSessionRecordFn?: typeof createCheckoutSessionRecord
  recordCheckoutAttemptResultFn?: typeof recordCheckoutAttemptResult
  updateCheckoutSessionStatusFn?: typeof updateCheckoutSessionStatus
}

interface SubmitCheckoutResult {
  order: {
    id: number
    status: string
    total: number
    rowVersion: number
  }
  payment: {
    provider: string
    checkoutSessionId: string
    providerTransactionReference: string
    redirectUrl: string
  }
  checkoutSessionId: string
}

class CheckoutSubmissionError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function parseJson(response: Response) {
  return response.json().catch(() => ({}))
}

function resolvePriceId(order: CheckoutOrderDTO) {
  for (const item of order.items) {
    if (typeof item.selectedVariant?.stripePriceId === "string" && item.selectedVariant.stripePriceId.length > 0) {
      return item.selectedVariant.stripePriceId
    }

    if (typeof item.product?.stripePriceId === "string" && item.product.stripePriceId.length > 0) {
      return item.product.stripePriceId
    }
  }

  if (typeof order.checkout?.priceId === "string" && order.checkout.priceId.length > 0) {
    return order.checkout.priceId
  }

  return null
}

export async function submitCheckoutOrder(
  input: SubmitCheckoutInput,
  deps?: SubmitCheckoutDependencies,
): Promise<SubmitCheckoutResult> {
  const fetchImpl = deps?.fetchImpl ?? fetch
  const createCheckoutLinkFn = deps?.createCheckoutLinkFn ?? createCheckoutLink
  const createCheckoutSessionRecordFn = deps?.createCheckoutSessionRecordFn ?? createCheckoutSessionRecord
  const recordCheckoutAttemptResultFn = deps?.recordCheckoutAttemptResultFn ?? recordCheckoutAttemptResult
  const updateCheckoutSessionStatusFn = deps?.updateCheckoutSessionStatusFn ?? updateCheckoutSessionStatus
  const priceId = resolvePriceId(input.order)

  const checkoutLink = await createCheckoutLinkFn({
    ownerUserId: input.customerId,
    currency: "usd",
    amountMin: input.order.totals.total,
    amountMax: input.order.totals.total,
    fixedAmount: input.order.totals.total,
    productMetadata: {
      source: "web_checkout",
      itemCount: input.order.items.length,
    },
  })

  const checkoutSession = await createCheckoutSessionRecordFn({
    checkoutLinkId: checkoutLink.id,
    customerId: input.customerId,
    methodType: input.order.payment.method,
    deviceContext: {
      entrypoint: "checkout.submit",
      userAgent: input.userAgent ?? null,
    },
    browserContext: {
      source: "web",
    },
    status: "created",
  })

  const commonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (input.cookieHeader) {
    commonHeaders.cookie = input.cookieHeader
  }

  try {
    const orderResponse = await fetchImpl(`${input.origin}/api/orders`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify(input.order),
    })

    const orderPayload = await parseJson(orderResponse)

    if (!orderResponse.ok) {
      await recordCheckoutAttemptResultFn({
        checkoutSessionId: checkoutSession.id,
        customerId: input.customerId,
        attemptStatus: "failed",
        attemptResultCode: "ORDER_CREATE_FAILED",
        attemptResultMessage: "Order creation failed",
        metadata: {
          provider: "runash",
          responseStatus: orderResponse.status,
          responseBody: orderPayload,
        },
      })
      await updateCheckoutSessionStatusFn({ checkoutSessionId: checkoutSession.id, customerId: input.customerId, status: "failed" })
      throw new CheckoutSubmissionError("Failed to create order", 502, "ORDER_CREATE_FAILED")
    }

    const orderId = Number(orderPayload?.id)

    if (!Number.isFinite(orderId)) {
      throw new CheckoutSubmissionError("Order response missing id", 502, "ORDER_RESPONSE_INVALID")
    }

    if (!priceId) {
      await recordCheckoutAttemptResultFn({
        checkoutSessionId: checkoutSession.id,
        customerId: input.customerId,
        attemptStatus: "failed",
        attemptResultCode: "CHECKOUT_PRICE_ID_REQUIRED",
        attemptResultMessage: "No Stripe price id found for checkout session creation",
        metadata: {
          provider: "stripe",
          orderId,
        },
      })
      await fetchImpl(`${input.origin}/api/orders/${orderId}`, {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify({ status: "failed" }),
      })
      await updateCheckoutSessionStatusFn({ checkoutSessionId: checkoutSession.id, customerId: input.customerId, status: "failed" })
      throw new CheckoutSubmissionError("Unable to create payment session for this cart", 400, "CHECKOUT_PRICE_ID_REQUIRED")
    }

    const checkoutResponse = await fetchImpl(`${input.origin}/api/checkout/session`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        priceId,
        mode: "payment",
        success_url: `${input.origin}/checkout/success?orderId=${orderId}`,
        cancel_url: `${input.origin}/checkout?orderId=${orderId}&status=cancelled`,
      }),
    })

    const checkoutPayload = await parseJson(checkoutResponse)
    const checkoutData = checkoutPayload?.data ?? checkoutPayload

    if (!checkoutResponse.ok) {
      await recordCheckoutAttemptResultFn({
        checkoutSessionId: checkoutSession.id,
        customerId: input.customerId,
        attemptStatus: "failed",
        attemptResultCode: "PAYMENT_SESSION_FAILED",
        attemptResultMessage: "Checkout session creation failed",
        metadata: {
          provider: "stripe",
          orderId,
          responseStatus: checkoutResponse.status,
          responseBody: checkoutPayload,
        },
      })
      await fetchImpl(`${input.origin}/api/orders/${orderId}`, {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify({ status: "failed" }),
      })
      await updateCheckoutSessionStatusFn({ checkoutSessionId: checkoutSession.id, customerId: input.customerId, status: "failed" })
      throw new CheckoutSubmissionError("Failed to create payment session", 502, "PAYMENT_SESSION_FAILED")
    }

    const provider = typeof checkoutData?.provider === "string" ? checkoutData.provider : "stripe"
    const checkoutSessionIdValue =
      typeof checkoutData?.checkoutSessionId === "string" && checkoutData.checkoutSessionId.length > 0
        ? checkoutData.checkoutSessionId
        : checkoutSession.id
    const providerTransactionReference =
      typeof checkoutData?.providerTransactionReference === "string" && checkoutData.providerTransactionReference.length > 0
        ? checkoutData.providerTransactionReference
        : checkoutSessionIdValue
    const redirectUrl =
      typeof checkoutData?.redirectUrl === "string"
        ? checkoutData.redirectUrl
        : typeof checkoutData?.url === "string"
          ? checkoutData.url
          : ""

    if (!redirectUrl) {
      throw new CheckoutSubmissionError("Payment session response missing redirect URL", 502, "PAYMENT_SESSION_INVALID")
    }

    await recordCheckoutAttemptResultFn({
      checkoutSessionId: checkoutSession.id,
      customerId: input.customerId,
      attemptStatus: "authorized",
      attemptResultCode: "PAYMENT_SESSION_CREATED",
      attemptResultMessage: "Checkout session created",
      metadata: {
        provider,
        orderId,
        checkoutSessionId: checkoutSessionIdValue,
        providerTransactionReference,
        redirectUrl,
      },
    })

    await updateCheckoutSessionStatusFn({ checkoutSessionId: checkoutSession.id, customerId: input.customerId, status: "authorized" })

    return {
      order: {
        id: orderId,
        status: typeof orderPayload?.status === "string" ? orderPayload.status : "pending",
        total: Number(orderPayload?.total ?? input.order.totals.total),
        rowVersion: Number(orderPayload?.row_version ?? 0),
      },
      payment: {
        provider,
        checkoutSessionId: checkoutSessionIdValue,
        providerTransactionReference,
        redirectUrl,
      },
      checkoutSessionId: checkoutSession.id,
    }
  } catch (error) {
    if (error instanceof CheckoutSubmissionError) {
      throw error
    }

    await recordCheckoutAttemptResultFn({
      checkoutSessionId: checkoutSession.id,
      customerId: input.customerId,
      attemptStatus: "failed",
      attemptResultCode: "CHECKOUT_SUBMISSION_FAILED",
      attemptResultMessage: "Checkout submission failed unexpectedly",
      metadata: {
        provider: "runash",
      },
    })
    await updateCheckoutSessionStatusFn({ checkoutSessionId: checkoutSession.id, customerId: input.customerId, status: "failed" })

    throw new CheckoutSubmissionError("Checkout submission failed", 500, "CHECKOUT_SUBMISSION_FAILED")
  }
}

export { CheckoutSubmissionError }
