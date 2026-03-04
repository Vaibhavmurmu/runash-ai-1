import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { PaymentService } from "@/lib/payment-service"
import { reconcileStuckCheckoutSessions } from "@/services/payment-checkout-profile-service"

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:admin")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => null)
  const limit = typeof body?.limit === "number" ? body.limit : 50
  const staleMinutes = typeof body?.staleMinutes === "number" ? body.staleMinutes : 45

  if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
    return respondError(request, { code: "INVALID_REQUEST", message: "limit must be between 1 and 500" }, { status: 400 })
  }

  if (!Number.isFinite(staleMinutes) || staleMinutes < 5 || staleMinutes > 24 * 60) {
    return respondError(request, { code: "INVALID_REQUEST", message: "staleMinutes must be between 5 and 1440" }, { status: 400 })
  }

  const [intentReconciliation, checkoutReconciliation] = await Promise.all([
    PaymentService.reconcilePaymentIntents(limit),
    reconcileStuckCheckoutSessions({ limit, staleMinutes }),
  ])

  return respondSuccess(request, {
    ok: true,
    paymentIntents: intentReconciliation,
    checkoutSessions: checkoutReconciliation,
  })
}

export const dynamic = "force-dynamic"
