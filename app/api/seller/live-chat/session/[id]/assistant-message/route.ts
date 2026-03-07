import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { resolveCorrelationId } from "@/lib/operations-observability"

const assistantMessageSchema = z.object({
  role: z.enum(["seller", "buyer"]).default("seller"),
  message: z.string().trim().min(1).max(2000),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const correlationId = resolveCorrelationId(request)

  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const body = await request.json().catch(() => ({}))
    const parsed = assistantMessageSchema.safeParse(body)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid assistant message payload" }, { status: 400 })
    }

    const service = AiLiveVideoChatService.getInstance()
    const result = await service.assistantTurn({
      sessionId: params.id,
      actorRole: parsed.data.role,
      actorUserId: userId,
      message: parsed.data.message,
    })

    if (result.blocked) {
      logApiEvent("warn", "seller.live_chat.assistant_message.blocked", {
        ...createRequestLogContext(request, { userId: String(userId) }),
        details: { sessionId: params.id, role: parsed.data.role, correlationId },
      })
      return respondError(
        request,
        { code: "MESSAGE_BLOCKED", message: result.reason ?? "Message blocked", details: { reply: result.reply } },
        { status: 422 },
      )
    }

    logApiEvent("info", "seller.live_chat.assistant_message.completed", {
      ...createRequestLogContext(request, { userId: String(userId) }),
      details: { sessionId: params.id, role: parsed.data.role, fallbackUsed: result.fallbackUsed, correlationId },
    })

    return respondSuccess(request, { reply: result.reply, fallbackUsed: result.fallbackUsed })
  } catch (error) {
    logApiEvent("error", "seller.live_chat.assistant_message.failed", {
      ...createRequestLogContext(request),
      details: { sessionId: params.id, correlationId },
      error,
    })
    return respondError(request, { code: "ASSISTANT_MESSAGE_FAILED", message: "Failed to process assistant message" }, { status: 500 })
  }
}
