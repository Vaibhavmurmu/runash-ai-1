import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const body = await request.json().catch(() => ({}))
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid session payload" }, { status: 400 })
    }

    const service = AiLiveVideoChatService.getInstance()
    const session = await service.createSession({ sellerUserId: userId, title: parsed.data.title })
    await service.joinSession({ sessionId: session.id, role: "seller", userId })

    return respondSuccess(request, { session })
  } catch {
    return respondError(request, { code: "LIVE_CHAT_CREATE_FAILED", message: "Failed to create live chat session" }, { status: 500 })
  }
}
