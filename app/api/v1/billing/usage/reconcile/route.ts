import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { reconcileDelayedUsageIngestion } from "@/lib/billing-usage"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => null)
  const limit = typeof body?.limit === "number" ? body.limit : 50

  if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
    return respondError(request, { code: "INVALID_REQUEST", message: "limit must be between 1 and 500" }, { status: 400 })
  }

  const result = await reconcileDelayedUsageIngestion(limit)
  return respondSuccess(request, { ok: true, ...result })
}

export const dynamic = "force-dynamic"
