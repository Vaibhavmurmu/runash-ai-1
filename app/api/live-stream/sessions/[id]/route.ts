import { NextRequest } from "next/server"

import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { liveStreamService, LiveStreamValidationError } from "@/services/live-stream/live-stream-service"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actorUserId = await requireSellerSessionUserId(request)
    if (actorUserId instanceof Response) return actorUserId

    const { id } = await context.params
    const result = await liveStreamService.getSession({ sessionId: id, actorUserId })

    return respondSuccess(request, result)
  } catch (error) {
    if (error instanceof LiveStreamValidationError) {
      return respondError(request, { code: "LIVE_STREAM_VALIDATION_FAILED", message: error.message }, { status: error.statusCode })
    }

    return respondError(request, { code: "LIVE_STREAM_GET_FAILED", message: "Failed to read live stream session" }, { status: 500 })
  }
}
