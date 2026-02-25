import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { verifySignedCheckoutReturnState } from "@/lib/payments/checkout-return-state"
import { getLatestCheckoutAttemptResultBySession } from "@/services/payment-checkout-profile-service"

const callbackSchema = z
  .object({
    state: z.string().min(1),
    provider_ref: z.string().min(1),
    checkout_session_id: z.string().min(1).optional(),
    provider: z.string().default("stripe"),
  })
  .strict()

type FinalStatus = "completed" | "pending" | "failed" | "expired"

function mapAttemptToStatus(status: string): FinalStatus {
  if (status === "completed") return "completed"
  if (status === "failed") return "failed"
  if (status === "expired") return "expired"
  return "pending"
}

function mapStripeSessionStatus(input: { status: string | null; paymentStatus: string | null }): FinalStatus {
  if (input.status === "expired") return "expired"
  if (input.status === "complete" && (input.paymentStatus === "paid" || input.paymentStatus === "no_payment_required")) {
    return "completed"
  }
  if (input.paymentStatus === "unpaid") return "failed"
  return "pending"
}

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response

  const query = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = callbackSchema.safeParse(query)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_CHECKOUT_RETURN_PAYLOAD", message: "Invalid return callback payload" }, { status: 400 })
  }

  const stateValidation = verifySignedCheckoutReturnState(parsed.data.state)
  if (!stateValidation.ok) {
    return respondError(
      request,
      { code: "INVALID_CHECKOUT_RETURN_STATE", message: "Invalid or expired checkout return state" },
      { status: 400, meta: { reason: stateValidation.code } },
    )
  }

  const resolvedSessionId = parsed.data.checkout_session_id ?? parsed.data.provider_ref
  const stateAllowsReference =
    stateValidation.payload.providerTransactionReference === parsed.data.provider_ref ||
    stateValidation.payload.providerTransactionReference === "{CHECKOUT_SESSION_ID}"
  const stateAllowsSession =
    stateValidation.payload.checkoutSessionId === resolvedSessionId ||
    stateValidation.payload.checkoutSessionId === "{CHECKOUT_SESSION_ID}"

  if (!stateAllowsReference || !stateAllowsSession) {
    return respondError(request, { code: "CHECKOUT_RETURN_REFERENCE_MISMATCH", message: "Return callback reference mismatch" }, { status: 400 })
  }

  let finalStatus: FinalStatus = "pending"
  const persistedAttempt = await getLatestCheckoutAttemptResultBySession({
    customerId: access.sessionUser.userId,
    checkoutSessionId: resolvedSessionId,
  })

  if (persistedAttempt) {
    finalStatus = mapAttemptToStatus(persistedAttempt.attemptStatus)
  } else if (parsed.data.provider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
    const checkoutSession = await stripe.checkout.sessions.retrieve(resolvedSessionId)
    finalStatus = mapStripeSessionStatus({
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
    })
  }

  return respondSuccess(request, {
    checkoutSessionId: resolvedSessionId,
    provider: parsed.data.provider,
    providerTransactionReference: parsed.data.provider_ref,
    finalStatus,
    resumedFrom: persistedAttempt ? "webhook-backed-state" : "provider-session-query",
  })
}

export const dynamic = "force-dynamic"
