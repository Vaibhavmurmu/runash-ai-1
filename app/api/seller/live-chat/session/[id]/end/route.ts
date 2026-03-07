import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { recordOperationMetric, resolveCorrelationId } from "@/lib/operations-observability"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const correlationId = resolveCorrelationId(request)

  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const service = AiLiveVideoChatService.getInstance()
    const startedAt = Date.now()
    await service.leaveSession({ sessionId: params.id, role: "seller", userId })
    const session = await service.endSession(params.id, userId)

    if (!session) {
      return respondError(request, { code: "SESSION_NOT_FOUND", message: "Session not found" }, { status: 404 })
    }

    if (session?.startedAt && session?.endedAt) {
      const uptimeSeconds = Math.max(0, Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
      recordOperationMetric("ops.stream_uptime.seconds", uptimeSeconds, { sessionId: session.id })
    }

    logApiEvent("info", "seller.live_chat.session.ended", {
      ...createRequestLogContext(request, { userId: String(userId) }),
      details: { sessionId: params.id, correlationId, latencyMs: Date.now() - startedAt },
    })

    return respondSuccess(request, { session })
  } catch (error) {
    logApiEvent("error", "seller.live_chat.session.end_failed", {
      ...createRequestLogContext(request),
      details: { sessionId: params.id, correlationId },
      error,
    })
    return respondError(request, { code: "LIVE_CHAT_END_FAILED", message: "Failed to end session" }, { status: 500 })
  }
}
