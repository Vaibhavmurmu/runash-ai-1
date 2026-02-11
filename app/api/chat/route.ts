import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { DatabaseService } from "@/lib/database"
import { authOptions } from "@/lib/auth"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { respondError, respondSuccess } from "@/lib/api/envelope"

export const maxDuration = 30

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

function parseBoundedInteger(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null) return fallback

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return null
  }

  return parsed
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return respondError(
        request,
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" } },
      )
    }

    const { messages, context } = await request.json()

    let systemPrompt = `You are RunAsh AI, a helpful assistant for the RunAsh platform. You help users with live streaming, grocery shopping, and platform features.`

    if (context === "grocery") {
      systemPrompt += ` You specialize in helping users find organic products, providing nutritional information, suggesting recipes, and assisting with grocery shopping decisions. You can recommend products based on dietary preferences, sustainability goals, and health needs.`
    } else if (context === "streaming") {
      systemPrompt += ` You specialize in helping users with live streaming setup, technical issues, content creation tips, and platform features. You can assist with streaming software, hardware recommendations, and audience engagement strategies.`
    }

    const result = streamText({
      model: openai("gpt-4-turbo"),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return respondError(
      request,
      { code: "INTERNAL_ERROR", message: "Internal Server Error" },
      { status: 500, legacy: { error: "Internal Server Error" } },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return respondError(
        request,
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
      return respondError(
        request,
        { code: "STREAM_ID_REQUIRED", message: "Stream ID required" },
        { status: 400, legacy: { error: "Stream ID required" } },
      )
    }

    if (limit === null || offset === null) {
      return respondError(
        request,
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

    const messages = await DatabaseService.getChatMessages({
      streamId,
      userId: session.user.id,
      limit,
      offset,
      cursor,
    })

    const nextOffset = offset + messages.length
    const hasMore = messages.length === limit
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].timestamp.toISOString() : null

    return respondSuccess(
      request,
      {
        messages,
        pagination: {
          limit,
          offset,
          nextOffset,
          hasMore,
          cursor,
          nextCursor,
        },
      },
      {
        legacy: {
          success: true,
          messages,
          pagination: {
            limit,
            offset,
            nextOffset,
            hasMore,
            cursor,
            nextCursor,
          },
        },
      },
    )
  } catch (error) {
    console.error("Get chat messages error:", error)
    return respondError(
      request,
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, legacy: { error: "Internal server error" } },
    )
  }
}
