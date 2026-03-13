import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { resolveCorrelationId } from "@/lib/operations-observability"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const correlationId = resolveCorrelationId(request)
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const { id } = params
    const service = new AIShortclipPipelineService()
    const job = await service.getJob(id, sellerUserId)

    if (!job) {
      return respondError(request, { code: "NOT_FOUND", message: "Clip job not found." }, { status: 404, legacy: { error: "Clip job not found" } })
    }

    logApiEvent("info", "seller.clips.job.fetched", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { jobId: job.id, correlationId } })
    return respondSuccess(request, { job }, { legacy: { job } })
  } catch (error) {
    logApiEvent("error", "seller.clips.job.fetch_failed", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { correlationId }, error })
    return respondError(
      request,
      { code: "CLIP_JOB_READ_FAILED", message: "Unable to load clip job." },
      { status: 500, legacy: { error: "Unable to load clip job" } },
    )
  }
}
