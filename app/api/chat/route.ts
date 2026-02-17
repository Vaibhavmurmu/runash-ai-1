import { type NextRequest } from "next/server"
import { DatabaseService } from "../../../lib/database"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { z } from "zod"
import { respondError, respondSuccess } from "../../../lib/api/envelope"
import { logApiEvent } from "../../../lib/api/logging"
import { resolveRequestId } from "../../../lib/api/response"
import { handleGetChat } from "./get-chat-handler"
import { getServerAuthSession } from "@/lib/auth/session"

export const maxDuration = 30

const chatPostSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string().min(1),
          content: z.unknown(),
        })
        .passthrough(),
    )
    .min(1)
    .max(100),
  context: z.enum(["grocery", "streaming"]).optional(),
})

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return respondError(
        request,
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" }, requestId },
      )
    }

    const body = await request.json()
    const validation = chatPostSchema.safeParse(body)

    if (!validation.success) {
      logApiEvent("warn", "chat.post.validation_failed", {
        requestId,
        route: "/api/chat",
        method: "POST",
        userId: session.user.id,
        details: {
          issues: validation.error.issues,
          body,
        },
      })

      return respondError(
        request,
        { code: "INVALID_REQUEST", message: "Invalid chat payload", details: validation.error.flatten() },
        { status: 400, legacy: { error: "Invalid chat payload" }, requestId },
      )
    }

    const { messages, context } = validation.data

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

    logApiEvent("info", "chat.post.stream_started", {
      requestId,
      route: "/api/chat",
      method: "POST",
      userId: session.user.id,
      details: { context, messageCount: messages.length },
    })

    return result.toDataStreamResponse({ headers: { "x-request-id": requestId } })
  } catch (error) {
    logApiEvent("error", "chat.post.failed", {
      requestId,
      route: "/api/chat",
      method: "POST",
      details: {},
      error,
    })

    return respondError(
      request,
      { code: "INTERNAL_ERROR", message: "Internal Server Error" },
      { status: 500, legacy: { error: "Internal Server Error" }, requestId },
    )
  }
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)

  return handleGetChat(request, {
    requestId,
    logEvent: (level, event, details) => {
      logApiEvent(level, event, {
        requestId,
        route: "/api/chat",
        method: "GET",
        details,
      })
    },
    getSessionUserId: async () => {
      const session = await getServerAuthSession()
      return session?.user?.id ?? null
    },
    getChatMessages: DatabaseService.getChatMessages,
    respondError: (error, options) => respondError(request, error, { ...options, requestId }),
    respondSuccess: (data, options) => respondSuccess(request, data, { ...options, requestId }),
  })
}
