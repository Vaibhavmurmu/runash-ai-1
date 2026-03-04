import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"

export async function POST(request: NextRequest) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const body = (await request.json()) as {
      assetIds?: string[]
      channels?: string[]
      reviewAction?: "submit_for_review" | "approve_and_publish"
    }

    if (!Array.isArray(body.assetIds) || body.assetIds.length === 0) {
      return respondError(
        request,
        { code: "VALIDATION_FAILED", message: "assetIds is required." },
        { status: 400, legacy: { error: "assetIds is required" } },
      )
    }

    const service = new AIShortclipPipelineService()
    const result = await service.publishAssets({
      sellerUserId,
      assetIds: body.assetIds,
      channels: body.channels ?? [],
      reviewAction: body.reviewAction,
    })

    return respondSuccess(request, { result }, { legacy: { result } })
  } catch {
    return respondError(
      request,
      { code: "CLIP_PUBLISH_FAILED", message: "Unable to process clip publish request." },
      { status: 500, legacy: { error: "Unable to process clip publish request" } },
    )
  }
}
