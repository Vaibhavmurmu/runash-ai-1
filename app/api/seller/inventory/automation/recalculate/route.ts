import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { recalculateInventoryRecommendations } from "@/services/ai-inventory-automation-service"
import { startInventoryAutomationScheduler } from "@/services/inventory-automation-scheduler"

startInventoryAutomationScheduler()

export async function POST(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const result = await recalculateInventoryRecommendations(userId, {
      initiatedBy: userId,
      reason: "manual_recalculate",
    })

    return respondSuccess(request, result, { legacy: result })
  } catch {
    return respondError(
      request,
      { code: "INVENTORY_AUTOMATION_SCHEDULED_RECALC_FAILED", message: "Failed to recalculate inventory forecast" },
      { status: 500, legacy: { error: "Failed to recalculate inventory forecast" } },
    )
  }
}
