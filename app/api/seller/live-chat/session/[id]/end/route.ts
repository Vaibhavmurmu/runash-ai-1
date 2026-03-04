import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { AiLiveVideoChatService } from "@/services/ai-live-videochat-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const service = AiLiveVideoChatService.getInstance()
    await service.leaveSession({ sessionId: params.id, role: "seller", userId })
    const session = await service.endSession(params.id, userId)

    if (!session) {
      return respondError(request, { code: "SESSION_NOT_FOUND", message: "Session not found" }, { status: 404 })
    }

    return respondSuccess(request, { session })
  } catch {
    return respondError(request, { code: "LIVE_CHAT_END_FAILED", message: "Failed to end session" }, { status: 500 })
  }
}
