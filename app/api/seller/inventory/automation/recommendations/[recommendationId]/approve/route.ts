import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { approveInventoryRecommendation } from "@/services/ai-inventory-automation-service"

type Params = { params: { recommendationId: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const result = await approveInventoryRecommendation(userId, params.recommendationId, userId)
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return respondError(request, { code: "NOT_FOUND", message: "Recommendation not found" }, { status: 404, legacy: { error: "Recommendation not found" } })
      }

      return respondError(request, { code: "ALREADY_APPLIED", message: "Recommendation already applied" }, { status: 409, legacy: { error: "Recommendation already applied" } })
    }

    return respondSuccess(request, { recommendation: result.recommendation }, { legacy: { recommendation: result.recommendation } })
  } catch {
    return respondError(
      request,
      { code: "INVENTORY_AUTOMATION_APPROVE_FAILED", message: "Failed to apply recommendation" },
      { status: 500, legacy: { error: "Failed to apply recommendation" } },
    )
  }
}
