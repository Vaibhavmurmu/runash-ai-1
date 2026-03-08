import type { CheckoutOrderDTO } from "@/lib/types/checkout-order"

interface CheckoutSubmissionResult {
  orderId: number
  checkoutSessionId: string
  redirectUrl: string
}

interface CheckoutSubmitError extends Error {
  code?: string
  status?: number
}

function toError(message: string, code?: string, status?: number): CheckoutSubmitError {
  const error = new Error(message) as CheckoutSubmitError
  error.code = code
  error.status = status
  return error
}

export async function submitCheckout(order: CheckoutOrderDTO): Promise<CheckoutSubmissionResult> {
  const response = await fetch("/api/checkout/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ order }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw toError(
      typeof payload?.error === "string" ? payload.error : "Checkout submission failed",
      typeof payload?.code === "string" ? payload.code : undefined,
      response.status,
    )
  }

  const data = payload?.data ?? payload
  const orderId = Number(data?.order?.id)
  const checkoutSessionId = typeof data?.payment?.checkoutSessionId === "string" ? data.payment.checkoutSessionId : ""
  const redirectUrl = typeof data?.payment?.redirectUrl === "string" ? data.payment.redirectUrl : ""

  if (!Number.isFinite(orderId) || !checkoutSessionId || !redirectUrl) {
    throw toError("Checkout response missing required fields", "INVALID_CHECKOUT_RESPONSE", 502)
  }

  return {
    orderId,
    checkoutSessionId,
    redirectUrl,
  }
}
