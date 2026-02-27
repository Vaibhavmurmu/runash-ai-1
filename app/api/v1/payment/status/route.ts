import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { verifySignedCheckoutReturnState } from "@/lib/payments/checkout-return-state"
import { resolvePaymentStatus } from "@/lib/payments/checkout-status-resolution"
import { mapResolvedStatusToRouteState } from "@/lib/payments/payment-status-mappers"

const paymentStatusQuerySchema = z
  .object({
    state: z.string().min(1).optional(),
    provider_ref: z.string().min(1).optional(),
    checkout_session_id: z.string().min(1).optional(),
    provider: z.string().default("stripe"),
    status_route: z.enum(["success", "error", "incomplete", "pending", "complete"]).optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response

  const parsed = paymentStatusQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PAYMENT_STATUS_QUERY", message: "Invalid payment status query" }, { status: 400 })
  }

  const { state, provider_ref, checkout_session_id, provider, status_route } = parsed.data

  if (!state && !checkout_session_id) {
    return respondError(
      request,
      { code: "MISSING_PAYMENT_STATUS_REFERENCE", message: "Provide a signed state or checkout_session_id" },
      { status: 400 },
    )
  }

  let resolvedSessionId = checkout_session_id ?? provider_ref ?? null
  if (state) {
    const stateValidation = verifySignedCheckoutReturnState(state)
    if (!stateValidation.ok) {
      return respondError(
        request,
        { code: "INVALID_CHECKOUT_RETURN_STATE", message: "Invalid or expired checkout return state" },
        { status: 400, meta: { reason: stateValidation.code } },
      )
    }

    resolvedSessionId = resolvedSessionId ?? stateValidation.payload.checkoutSessionId

    if (!resolvedSessionId) {
      return respondError(
        request,
        { code: "MISSING_CHECKOUT_SESSION", message: "Could not resolve checkout session from state" },
        { status: 400 },
      )
    }

    if (provider_ref) {
      const stateAllowsReference =
        stateValidation.payload.providerTransactionReference === provider_ref ||
        stateValidation.payload.providerTransactionReference === "{CHECKOUT_SESSION_ID}"
      if (!stateAllowsReference) {
        return respondError(
          request,
          { code: "CHECKOUT_RETURN_REFERENCE_MISMATCH", message: "Return callback reference mismatch" },
          { status: 400 },
        )
      }
    }

    const stateAllowsSession =
      stateValidation.payload.checkoutSessionId === resolvedSessionId || stateValidation.payload.checkoutSessionId === "{CHECKOUT_SESSION_ID}"

    if (!stateAllowsSession) {
      return respondError(
        request,
        { code: "CHECKOUT_RETURN_REFERENCE_MISMATCH", message: "Return callback reference mismatch" },
        { status: 400 },
      )
    }
  }

  if (!resolvedSessionId) {
    return respondError(
      request,
      { code: "MISSING_CHECKOUT_SESSION", message: "Could not resolve checkout session from query" },
      { status: 400 },
    )
  }

  const resolution = await resolvePaymentStatus({
    customerId: access.sessionUser.userId,
    checkoutSessionId: resolvedSessionId,
    provider,
  })

  return respondSuccess(request, {
    requestedRouteState: status_route ?? null,
    routeState: mapResolvedStatusToRouteState(resolution.resolvedStatus),
    shouldRedirect: status_route ? status_route !== mapResolvedStatusToRouteState(resolution.resolvedStatus) : false,
    ...resolution,
  })
}

export const dynamic = "force-dynamic"
