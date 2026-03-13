import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { resolveCorrelationId } from "@/lib/operations-observability"

const joinSchema = z.object({
  role: z.enum(["seller", "buyer", "assistant"]).default("seller"),
  displayName: z.string().trim().max(80).optional(),
  media: z
    .object({
      kind: z.enum(["audio", "video", "presence"]),
      state: z.string().trim().min(1).max(50),
      latencyMs: z.number().int().nonnegative().max(10000).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const correlationId = resolveCorrelationId(request)

  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const body = await request.json().catch(() => ({}))
    const parsed = joinSchema.safeParse(body)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid join payload" }, { status: 400 })
    }

    const service = AiLiveVideoChatService.getInstance()
    const startedAt = Date.now()
    const participant = await service.joinSession({
      sessionId: params.id,
      role: parsed.data.role,
      userId: parsed.data.role === "seller" ? userId : null,
      displayName: parsed.data.displayName,
    })

    if (parsed.data.media) {
      await service.routeMediaEvent({
        sessionId: params.id,
        actorRole: parsed.data.role,
        actorUserId: parsed.data.role === "seller" ? userId : null,
        eventType: parsed.data.media.kind,
        payload: { state: parsed.data.media.state },
        latencyMs: parsed.data.media.latencyMs,
      })
    }

    logApiEvent("info", "seller.live_chat.session.joined", {
      ...createRequestLogContext(request, { userId: String(userId) }),
      details: { sessionId: params.id, role: parsed.data.role, correlationId, latencyMs: Date.now() - startedAt },
    })

    return respondSuccess(request, { participant, recentEvents: service.getRecentRoutedEvents(params.id).slice(-20) })
  } catch (error) {
    logApiEvent("error", "seller.live_chat.session.join_failed", {
      ...createRequestLogContext(request),
      details: { sessionId: params.id, correlationId },
      error,
    })
    return respondError(request, { code: "LIVE_CHAT_JOIN_FAILED", message: "Failed to join live chat session" }, { status: 500 })
  }
}
