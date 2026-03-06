import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { resolveCorrelationId } from "@/lib/operations-observability"

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request)
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const body = (await request.json()) as {
      recordingId?: string
      sourceUploadKey?: string
      sourceUrl?: string
      titleHint?: string
      clipCount?: number
      channels?: string[]
      reviewRequired?: boolean
    }

    if (!body.recordingId && !body.sourceUploadKey && !body.sourceUrl) {
      return respondError(
        request,
        { code: "VALIDATION_FAILED", message: "Provide recordingId, sourceUploadKey, or sourceUrl." },
        { status: 400, legacy: { error: "Missing media source" } },
      )
    }

    const service = new AIShortclipPipelineService()
    const job = await service.startJob({
      sellerUserId,
      recordingId: body.recordingId,
      sourceUploadKey: body.sourceUploadKey,
      sourceUrl: body.sourceUrl,
      titleHint: body.titleHint,
      clipCount: body.clipCount,
      channels: body.channels ?? [],
      reviewRequired: body.reviewRequired,
    })

    logApiEvent("info", "seller.clips.job.created", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { jobId: job.id, correlationId } })
    return respondSuccess(request, { job }, { legacy: { job } })
  } catch (error) {
    logApiEvent("error", "seller.clips.job.create_failed", { ...createRequestLogContext(request, { userId: String(sellerUserId) }), details: { correlationId }, error })
    return respondError(
      request,
      { code: "CLIP_JOB_CREATE_FAILED", message: "Unable to create clip generation job." },
      { status: 500, legacy: { error: "Unable to create clip generation job" } },
    )
  }
}
