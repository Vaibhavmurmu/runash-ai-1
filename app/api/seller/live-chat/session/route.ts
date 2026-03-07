import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { recordOperationMetric, resolveCorrelationId } from "@/lib/operations-observability"

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request)

  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const body = await request.json().catch(() => ({}))
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid session payload" }, { status: 400 })
    }

    const service = AiLiveVideoChatService.getInstance()
    const session = await service.createSession({ sellerUserId: userId, title: parsed.data.title, correlationId })
    await service.joinSession({ sessionId: session.id, role: "seller", userId })

    recordOperationMetric("ops.session_start.success", 1, { route: "seller.live_chat.session.create" })
    logApiEvent("info", "seller.live_chat.session.created", {
      ...createRequestLogContext(request, { userId: String(userId) }),
      details: { sessionId: session.id, correlationId },
    })

    return respondSuccess(request, { session })
  } catch (error) {
    recordOperationMetric("ops.session_start.failed", 1, { route: "seller.live_chat.session.create" })
    logApiEvent("error", "seller.live_chat.session.create_failed", {
      ...createRequestLogContext(request),
      details: { correlationId },
      error,
    })
    return respondError(request, { code: "LIVE_CHAT_CREATE_FAILED", message: "Failed to create live chat session" }, { status: 500 })
  }
}
