import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { getPortalMetricsSnapshot } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const metrics = await getPortalMetricsSnapshot(access.sessionUser.userId)
  return respondSuccess(request, metrics)
}
