import type { ChatMessage, ChatMessagesQuery } from "../../../lib/database"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

export type ChatGetDependencies = {
  getSessionUserId: () => Promise<string | null>
  getChatMessages: (query: ChatMessagesQuery) => Promise<ChatMessage[]>
  respondError: (error: { code: string; message: string }, options: { status: number; legacy: Record<string, unknown> }) => Response
  respondSuccess: (data: Record<string, unknown>, options: { legacy: Record<string, unknown> }) => Response
}

function parseBoundedInteger(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null) return fallback

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return null
  }

  return parsed
}

export async function handleGetChat(request: Request, dependencies: ChatGetDependencies) {
  try {
    const userId = await dependencies.getSessionUserId()

    if (!userId) {
      return dependencies.respondError(
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" } },
      )
    }

    const { searchParams } = new URL(request.url)
    const streamId = searchParams.get("streamId")
    const limit = parseBoundedInteger(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT)
    const offset = parseBoundedInteger(searchParams.get("offset"), 0, 0, MAX_OFFSET)
    const cursor = searchParams.get("cursor")

    if (!streamId) {
      return dependencies.respondError(
        { code: "STREAM_ID_REQUIRED", message: "Stream ID required" },
        { status: 400, legacy: { error: "Stream ID required" } },
      )
    }

    if (limit === null || offset === null) {
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

    return dependencies.respondSuccess(data, {
      legacy: {
        success: true,
        ...data,
      },
    })
  } catch (error) {
    console.error("Get chat messages error:", error)
    return dependencies.respondError(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, legacy: { error: "Internal server error" } },
    )
  }
}
