import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"

type Session = { user: { id: string } } | null

export interface StreamRouteDependencies {
  getSession: () => Promise<Session>
  getStreamById: (id: string) => Promise<Record<string, unknown> | null>
}

export async function handleGetStream(req: NextRequest, params: { id: string }, deps: StreamRouteDependencies) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()

  const session = await deps.getSession()
  if (!session) {
    return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
  }

  const stream = await deps.getStreamById(params.id)
  if (!stream) {
    return respondError(req, { code: "STREAM_NOT_FOUND", message: "Stream not found" }, { status: 404, requestId })
  }

  return respondSuccess(req, { stream }, { requestId })
}
