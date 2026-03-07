import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { resolveCorrelationId } from "@/lib/operations-observability"

export async function GET(request: NextRequest) {
  const correlationId = resolveCorrelationId(request)
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const service = new AIShortclipPipelineService()
    const assets = await service.listAssets(sellerUserId)

    logApiEvent("info", "seller.clips.assets.fetched", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { count: assets.length, correlationId } })
    return respondSuccess(request, { assets }, { legacy: { assets } })
  } catch (error) {
    logApiEvent("error", "seller.clips.assets.fetch_failed", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { correlationId }, error })
    return respondError(
      request,
      { code: "CLIP_ASSETS_READ_FAILED", message: "Unable to load generated clip assets." },
      { status: 500, legacy: { error: "Unable to load generated clip assets" } },
    )
  }
}
