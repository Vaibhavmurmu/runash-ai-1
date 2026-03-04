import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AIShortclipPipelineService } from "@/services/ai-shortclip-pipeline-service"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const { id } = params
    const service = new AIShortclipPipelineService()
    const job = await service.getJob(id, sellerUserId)

    if (!job) {
      return respondError(request, { code: "NOT_FOUND", message: "Clip job not found." }, { status: 404, legacy: { error: "Clip job not found" } })
    }

    return respondSuccess(request, { job }, { legacy: { job } })
  } catch {
    return respondError(
      request,
      { code: "CLIP_JOB_READ_FAILED", message: "Unable to load clip job." },
      { status: 500, legacy: { error: "Unable to load clip job" } },
    )
  }
}
