import { type NextRequest } from "next/server"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { runCarrierEventReconciliation } from "@/services/carrier-event-reconciliation-worker"

export async function POST(request: NextRequest) {
  const sessionCheck = await requireSellerSessionUserId(request)
  if (sessionCheck instanceof Response) return sessionCheck

  try {
    const result = await runCarrierEventReconciliation()
    return respondSuccess(request, result, { legacy: result })
  } catch {
    return respondError(request, { code: "SHIPMENT_RECONCILIATION_FAILED", message: "Failed to reconcile carrier events" }, { status: 500, legacy: { error: "Failed to reconcile carrier events" } })
  }
}
