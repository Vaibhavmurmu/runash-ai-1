import { respondError } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"

export type BackgroundRouteContext = { params: { id: string } }

export async function requireStreamOwner(request: Request, streamId: string) {
  const session = await getServerAuthSession()
  if (!session) {
    return { error: respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 }) }
  }

  const stream = await Database.getStreamById(streamId)
  if (!stream || stream.user_id !== session.user.id) {
    return {
      error: respondError(request, { code: "STREAM_NOT_FOUND", message: "Stream not found or unauthorized" }, { status: 404 }),
    }
  }

  return { session, stream }
}
