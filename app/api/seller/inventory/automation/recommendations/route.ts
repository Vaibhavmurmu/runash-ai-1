import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import {
  listInventoryRecommendations,
  recalculateInventoryRecommendations,
} from "@/services/ai-inventory-automation-service"
import { startInventoryAutomationScheduler } from "@/services/inventory-automation-scheduler"

startInventoryAutomationScheduler()

export async function GET(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const recommendations = await listInventoryRecommendations(userId)
    return respondSuccess(request, { recommendations }, { legacy: { recommendations } })
  } catch {
    return respondError(
      request,
      { code: "INVENTORY_AUTOMATION_READ_FAILED", message: "Failed to load inventory recommendations" },
      { status: 500, legacy: { error: "Failed to load inventory recommendations" } },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const result = await recalculateInventoryRecommendations(userId, {
      initiatedBy: userId,
      reason: "api_refresh",
    })

    return respondSuccess(request, result, { status: 201, legacy: result })
  } catch {
    return respondError(
      request,
      { code: "INVENTORY_AUTOMATION_RECALC_FAILED", message: "Failed to recalculate inventory recommendations" },
      { status: 500, legacy: { error: "Failed to recalculate inventory recommendations" } },
    )
  }
}
