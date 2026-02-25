import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { verifySignedCheckoutReturnState } from "@/lib/payments/checkout-return-state"
import { resolvePaymentStatus } from "@/lib/payments/checkout-status-resolution"
import { mapResolutionToFinalStatus } from "@/lib/payments/checkout-callback-mappers"

const callbackSchema = z
  .object({
    state: z.string().min(1),
    provider_ref: z.string().min(1),
    checkout_session_id: z.string().min(1).optional(),
    provider: z.string().default("stripe"),
  })
  .strict()

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

  const resolution = await resolvePaymentStatus({
    customerId: access.sessionUser.userId,
    checkoutSessionId: resolvedSessionId,
    provider: parsed.data.provider,
  })

  const finalStatus = mapResolutionToFinalStatus(resolution.resolvedStatus)

  return respondSuccess(request, {
    checkoutSessionId: resolvedSessionId,
    provider: parsed.data.provider,
    providerTransactionReference: parsed.data.provider_ref,
    finalStatus,
    resumedFrom: resolution.source,
  })
}

export const dynamic = "force-dynamic"
