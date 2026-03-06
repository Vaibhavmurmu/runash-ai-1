import { z } from "zod"

import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { createSessionMessage } from "@/lib/repositories/runash-chat"

const createMessageSchema = z.object({
  sessionId: z.string().trim().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(6000),
  messageType: z.enum(["text", "product", "recipe", "tip", "automation"]).optional(),
})

export type MessagesDependencies = {
  getUserId: () => Promise<string>
  isSessionOwnedByUser: (sessionId: string, userId: string) => Promise<boolean>
  createSessionMessage: (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    messageType: "text" | "product" | "recipe" | "tip" | "automation",
    userId: string,
  ) => Promise<Awaited<ReturnType<typeof createSessionMessage>>>
}

function isSessionAccessDeniedError(error: unknown) {
  return error instanceof Error && error.message === "SESSION_ACCESS_DENIED"
}


export async function handleCreateMessage(request: Request, dependencies: MessagesDependencies) {
  const requestId = resolveRequestId(request)
  const userId = await dependencies.getUserId()

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = createMessageSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(
        request,
        { code: "INVALID_REQUEST", message: "sessionId, role and content are required" },
        { status: 400, requestId },
      )
    }

    const isOwned = await dependencies.isSessionOwnedByUser(parsed.data.sessionId, userId)
    if (!isOwned) {
      return respondError(
        request,
        { code: "SESSION_ACCESS_DENIED", message: "Forbidden" },
        { status: 403, requestId },
      )
    }

    const message = await dependencies.createSessionMessage(
      parsed.data.sessionId,
      parsed.data.role,
      parsed.data.content,
      parsed.data.messageType ?? "text",
      userId,
    )

    return respondSuccess(request, message, { status: 201, requestId })
  } catch (error) {
    if (isSessionAccessDeniedError(error)) {
      return respondError(request, { code: "SESSION_ACCESS_DENIED", message: "Forbidden" }, { status: 403, requestId })
    }

    logApiEvent("error", "messages.create.failed", {
      requestId,
      route: "/api/messages",
      method: "POST",
      details: {},
      error,
    })

    return respondError(request, { code: "MESSAGE_CREATE_FAILED", message: "Unable to store message" }, { status: 500, requestId })
  }
}
