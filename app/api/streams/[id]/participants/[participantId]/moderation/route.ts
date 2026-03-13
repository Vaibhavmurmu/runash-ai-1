import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { moderateStreamParticipant } from "@/lib/repositories/stream-studio"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; participantId: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload = (await request.json()) as { action?: "make_moderator" | "make_vip" | "timeout" | "clear_timeout" }
    if (!payload.action) {
      return respondError(request, { code: "VALIDATION_FAILED", message: "Action is required." }, { status: 400 })
    }
    const participant = await moderateStreamParticipant(params.id, params.participantId, payload.action)
    return respondSuccess(request, { participant })
  } catch {
    return respondError(request, { code: "STREAM_PARTICIPANT_MODERATION_FAILED", message: "Moderation action failed." }, { status: 400 })
  }
}
