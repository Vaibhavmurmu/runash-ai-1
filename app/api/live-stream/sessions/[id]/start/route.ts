import { NextRequest } from "next/server"

import { requireSellerOperation } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { liveStreamService, LiveStreamValidationError } from "@/services/live-stream/live-stream-service"

function readIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key")?.trim()
  if (!key) return null
  return key.slice(0, 255)
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSellerOperation(request, "start_stream")
    if (auth instanceof Response) return auth
    const actorUserId = auth.userId

    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      return respondError(request, { code: "MISSING_IDEMPOTENCY_KEY", message: "Idempotency-Key header is required" }, { status: 400 })
    }

    const { id } = await context.params
    const result = await liveStreamService.startSession({ sessionId: id, actorUserId, idempotencyKey })

    return respondSuccess(request, result)
  } catch (error) {
    if (error instanceof LiveStreamValidationError) {
      return respondError(request, { code: "LIVE_STREAM_VALIDATION_FAILED", message: error.message }, { status: error.statusCode })
    }

    return respondError(request, { code: "LIVE_STREAM_START_FAILED", message: "Failed to start live stream session" }, { status: 500 })
  }
}
