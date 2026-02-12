import type { ChatMessage, ChatMessagesQuery } from "../../../lib/database"
import { z } from "zod"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

const chatQuerySchema = z.object({
  streamId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).max(MAX_OFFSET).default(0),
  cursor: z.string().datetime({ offset: true }).optional().or(z.literal("")).transform((value) => value || null),
})

export type ChatGetDependencies = {
  getSessionUserId: () => Promise<string | null>
  getChatMessages: (query: ChatMessagesQuery) => Promise<ChatMessage[]>
  requestId?: string
  logEvent?: (level: "info" | "warn" | "error", event: string, details?: Record<string, unknown>) => void
  respondError: (error: { code: string; message: string }, options: { status: number; legacy: Record<string, unknown> }) => Response
  respondSuccess: (data: Record<string, unknown>, options: { legacy: Record<string, unknown> }) => Response
}

export async function handleGetChat(request: Request, dependencies: ChatGetDependencies) {
  try {
    const userId = await dependencies.getSessionUserId()

    if (!userId) {
      dependencies.logEvent?.("warn", "chat.get.unauthorized")
      return dependencies.respondError(
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" } },
      )
    }

    const { searchParams } = new URL(request.url)
    const parsedQuery = chatQuerySchema.safeParse({
      streamId: searchParams.get("streamId"),
      limit: searchParams.get("limit") ?? DEFAULT_LIMIT,
      offset: searchParams.get("offset") ?? 0,
      cursor: searchParams.get("cursor") ?? "",
    })

    if (!parsedQuery.success) {
      const hasStreamIdIssue = parsedQuery.error.issues.some((issue) => issue.path.includes("streamId"))
      if (hasStreamIdIssue) {
        dependencies.logEvent?.("warn", "chat.get.validation_failed", { reason: "missing_stream_id" })
        return dependencies.respondError(
          { code: "STREAM_ID_REQUIRED", message: "Stream ID required" },
          { status: 400, legacy: { error: "Stream ID required" } },
        )
      }

      return dependencies.respondError(
        {
          code: "INVALID_PAGINATION",
          message: `Invalid pagination. limit must be 1-${MAX_LIMIT} and offset must be 0-${MAX_OFFSET}`,
        },
        {
          status: 400,
          legacy: { error: "Invalid pagination parameters" },
        },
      )
    }

    const { streamId, limit, offset, cursor } = parsedQuery.data

    const messages = await dependencies.getChatMessages({
      streamId,
      userId,
      limit,
      offset,
      cursor,
    })

    const nextOffset = offset + messages.length
    const hasMore = messages.length === limit
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].timestamp.toISOString() : null

    const data = {
      messages,
      pagination: {
        limit,
        offset,
        nextOffset,
        hasMore,
        cursor,
        nextCursor,
      },
    }

    dependencies.logEvent?.("info", "chat.get.success", {
      streamId,
      limit,
      offset,
      resultCount: messages.length,
    })

    return dependencies.respondSuccess(data, {
      legacy: {
        success: true,
        ...data,
      },
    })
  } catch (error) {
    dependencies.logEvent?.("error", "chat.get.failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return dependencies.respondError(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, legacy: { error: "Internal server error" } },
    )
  }
}
