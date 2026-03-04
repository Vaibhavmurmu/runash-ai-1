import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"

export async function GET(request: NextRequest) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const service = new AIShortclipPipelineService()
    const assets = await service.listAssets(sellerUserId)

    return respondSuccess(request, { assets }, { legacy: { assets } })
  } catch {
    return respondError(
      request,
      { code: "CLIP_ASSETS_READ_FAILED", message: "Unable to load generated clip assets." },
      { status: 500, legacy: { error: "Unable to load generated clip assets" } },
    )
  }
}
