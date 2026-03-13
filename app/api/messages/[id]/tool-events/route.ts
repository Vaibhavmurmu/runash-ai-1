import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { createChatToolEvents } from "@/lib/repositories/session-messages"
import { getMessageByIdForUser } from "@/lib/repositories/runash-chat"

const paramsSchema = z.object({ id: z.string().trim().min(1) })

const toolEventSchema = z.object({
  type: z.enum(["tool_start", "tool_result", "tool_error"]),
  tool: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()),
  durationMs: z.number().int().min(0).optional(),
})

const requestSchema = z.object({
  events: z.array(toolEventSchema).min(1).max(200),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const resolvedParams = await params
  const requestId = resolveRequestId(request)
  const session = await getServerAuthSession()
  const userId = session?.user?.id ? String(session.user.id) : null

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  const parsedParams = paramsSchema.safeParse(resolvedParams)
  if (!parsedParams.success) {
    return respondError(request, { code: "MESSAGE_ID_REQUIRED", message: "Message id is required" }, { status: 400, requestId })
  }

  const payload = await request.json().catch(() => ({}))
  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_REQUEST", message: "events are required" }, { status: 400, requestId })
  }

  const message = await getMessageByIdForUser(parsedParams.data.id, userId)
  if (!message) {
    return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
  }

  const created = await createChatToolEvents(
    parsedParams.data.id,
    parsed.data.events.map((event) => ({
      toolName: event.tool,
      phase: event.type,
      payload: event.payload,
      durationMs: event.durationMs,
    })),
  )

  return respondSuccess(request, { count: created.length }, { status: 201, requestId })
}
