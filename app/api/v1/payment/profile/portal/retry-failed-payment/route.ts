import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { createPortalLifecycleAction } from "@/services/payment-checkout-profile-service"

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const body = await request.json().catch(() => ({}))
  const action = await createPortalLifecycleAction({
    customerId: access.sessionUser.userId,
    actionType: "retry_failed_payment",
    metadata: {
      ...(typeof body === "object" && body ? body : {}),
      trigger: "manual_portal_retry",
    },
  })

  return respondSuccess(request, action, { status: 201 })
}
