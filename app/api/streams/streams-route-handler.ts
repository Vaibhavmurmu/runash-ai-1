import { type NextRequest } from "next/server"
import { z } from "zod"

const ROUTE = "/api/streams"

/**
 * Canonical seller scheduling payload used by `components/seller/live-stream-manager.tsx`.
 */
export const sellerScheduleRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  platform: z.string().trim().min(1, "Platform is required"),
  scheduled_for: z.string().datetime({ offset: true }),
})

type Session = { user: { id: string } }
type StreamStore = {
  createStream: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  getUserStreams: (userId: string) => Promise<Record<string, unknown>[]>
}

type RespondError = (
  req: NextRequest,
  error: { code: string; message: string },
  options: { status: number; requestId: string },
) => Response

type RespondSuccess = (req: NextRequest, data: Record<string, unknown>, options: { requestId: string }) => Response

type LogEvent = (level: "info" | "error", event: string, meta: Record<string, unknown>) => void

export type StreamsRouteDeps = {
  getSession: () => Promise<Session | null>
  database: StreamStore
  respondOk: RespondSuccess
  respondErr: RespondError
  logEvent: LogEvent
}

export async function handleStreamsPost(req: NextRequest, deps: StreamsRouteDeps) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await deps.getSession()
    if (!session) {
      return deps.respondErr(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const parsed = sellerScheduleRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return deps.respondErr(
        req,
        { code: "VALIDATION_FAILED", message: parsed.error.issues[0]?.message ?? "Invalid schedule request" },
        { status: 400, requestId },
      )
    }

    const { title, description, platform, scheduled_for } = parsed.data

    const streamKey = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stream = await deps.database.createStream({
      title,
      description,
      user_id: session.user.id,
      status: "scheduled",
      platform,
      stream_key: streamKey,
      viewer_count: 0,
      started_at: new Date(scheduled_for),
    })

    deps.logEvent("info", "streams.create.success", {
      requestId,
      route: ROUTE,
      method: req.method,
      userId: session.user.id,
      details: { operation: "create-stream", streamId: stream.id, platform },
    })

    return deps.respondOk(req, { stream }, { requestId })
  } catch (error) {
    deps.logEvent("error", "streams.create.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "create-stream", code: "STREAM_CREATE_FAILED" },
      error,
    })
    return deps.respondErr(req, { code: "STREAM_CREATE_FAILED", message: "Unable to create stream." }, { status: 500, requestId })
  }
}

export async function handleStreamsGet(req: NextRequest, deps: StreamsRouteDeps) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await deps.getSession()
    if (!session) {
      return deps.respondErr(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const streams = await deps.database.getUserStreams(session.user.id)
    return deps.respondOk(req, { streams }, { requestId })
  } catch (error) {
    deps.logEvent("error", "streams.list.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "list-streams", code: "STREAM_LIST_FAILED" },
      error,
    })
    return deps.respondErr(req, { code: "STREAM_LIST_FAILED", message: "Unable to load streams." }, { status: 500, requestId })
  }
}
