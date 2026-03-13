import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { listStreamParticipants } from "@/lib/repositories/stream-studio"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const platform = request.nextUrl.searchParams.get("platform") as "twitch" | "youtube" | "facebook" | "tiktok" | null
    const participants = await listStreamParticipants(params.id, platform ?? undefined)
    return respondSuccess(request, { participants })
  } catch {
    return respondError(request, { code: "STREAM_PARTICIPANTS_NOT_FOUND", message: "Participants not found." }, { status: 404 })
  }
}
