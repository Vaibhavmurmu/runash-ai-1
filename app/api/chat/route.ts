import { type NextRequest } from "next/server"
import { Database } from "@/lib/database"
import { z } from "zod"
import { respondError, respondSuccess } from "../../../lib/api/envelope"
import { logApiEvent } from "../../../lib/api/logging"
import { resolveRequestId } from "../../../lib/api/response"
import { handleGetChat } from "./get-chat-handler"
import { getServerAuthSession } from "@/lib/auth/session"
import {
  AIProviderError,
  resolveModelSelection,
  streamModelTextWithFallback,
} from "@/lib/ai/provider-registry"
import { routeToolsToMcp } from "@/lib/runash-chat/tooling"
import { CHAT_ERROR_CODES, chatAttachmentSchema, clientRequestIdSchema, streamRetrySchema } from "@/lib/chat-contracts"
import { listOwnedChatAttachmentsByIds, markPendingMessageAsCompleted } from "@/lib/repositories/chat-attachments"

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
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  clientRequestId: clientRequestIdSchema.optional(),
  attachments: z.array(chatAttachmentSchema).max(4).optional(),
  attachmentIds: z.array(z.string().trim().min(1)).max(4).optional(),
  sessionId: z.string().trim().min(1).optional(),
  pendingMessageId: z.string().trim().min(1).optional(),
  retry: streamRetrySchema.optional(),
})

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const route = "/api/chat"
  const startedAt = Date.now()
  const logMetric = (name: string, details: Record<string, unknown>, level: "info" | "warn" | "error" = "info") => {
    logApiEvent(level, `chat.post.metric.${name}`, {
      requestId,
      route,
      method: "POST",
      details,
    })
  }

  logMetric("request_start", { status: "started" })

  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      logMetric("auth_rejection", { reason: "missing_session", status: 401 }, "warn")
      logMetric("request_end", { status: 401, latencyMs: Date.now() - startedAt, outcome: "rejected" }, "warn")
      return respondError(
        request,
        { code: CHAT_ERROR_CODES.AUTH_REQUIRED, message: "Unauthorized" },
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

      logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "invalid_request" }, "warn")
      return respondError(
        request,
        { code: CHAT_ERROR_CODES.INVALID_REQUEST, message: "Invalid chat payload", details: validation.error.flatten() },
        { status: 400, legacy: { error: "Invalid chat payload" }, requestId },
      )
    }

    const { messages, context, provider, model, attachments, attachmentIds, sessionId, pendingMessageId, retry } = validation.data
    const latestMessage = messages.at(-1)

    let systemPrompt = `You are RunAsh AI, a helpful assistant for the RunAsh platform. You help users with live streaming, grocery shopping, and platform features.`

    if (context === "grocery") {
      systemPrompt += ` You specialize in helping users find organic products, providing nutritional information, suggesting recipes, and assisting with grocery shopping decisions. You can recommend products based on dietary preferences, sustainability goals, and health needs.`
    } else if (context === "streaming") {
      systemPrompt += ` You specialize in helping users with live streaming setup, technical issues, content creation tips, and platform features. You can assist with streaming software, hardware recommendations, and audience engagement strategies.`
    }


    const normalizedAttachmentIds = Array.from(new Set((attachmentIds ?? []).map((value) => value.trim()).filter(Boolean)))
    if (normalizedAttachmentIds.length > 0) {
      const ownedAttachments = await listOwnedChatAttachmentsByIds({ userId: String(session.user.id), attachmentIds: normalizedAttachmentIds })
      if (ownedAttachments.length !== normalizedAttachmentIds.length) {
        logMetric("ownership_rejection", { reason: "attachment_not_owned", status: 400 }, "warn")
        logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "invalid_attachment" }, "warn")
        return respondError(
          request,
          { code: CHAT_ERROR_CODES.INVALID_ATTACHMENT, message: "One or more attachment IDs are invalid" },
          { status: 400, legacy: { error: "Invalid attachment IDs" }, requestId },
        )
      }

      if (sessionId && pendingMessageId) {
        const latestContent = typeof latestMessage?.content === "string" ? latestMessage.content : JSON.stringify(latestMessage?.content ?? "")
        await markPendingMessageAsCompleted({
          userId: String(session.user.id),
          sessionId,
          messageId: pendingMessageId,
          content: latestContent,
          metadata: { attachment_ids: normalizedAttachmentIds },
        })
      }
    }
    const normalizedMessages = messages.map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
    }))

    const toolRouting =
      latestMessage && typeof latestMessage.content === "string"
        ? await routeToolsToMcp({
            message: latestMessage.content,
            actor: { userId: session.user.id, roles: [] },
          })
        : { requestedTools: [], mcpResults: [], fallbackTools: [] }

    const selection = resolveModelSelection(model, provider)
    const result = await streamModelTextWithFallback(selection, {
      system: systemPrompt,
      messages: normalizedMessages,
      temperature: 0.7,
      maxTokens: 1000,
    })

    const encoder = new TextEncoder()
    const streamStartedAt = Date.now()
    let streamedTokenCount = 0
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of result.textStream) {
            streamedTokenCount += 1
            controller.enqueue(encoder.encode(delta))
          }
        } finally {
          logMetric("stream_summary", {
            durationMs: Date.now() - streamStartedAt,
            streamedTokenCount,
            toolInvocations: toolRouting.requestedTools.length,
            toolFailures: toolRouting.fallbackTools.length,
          })
          logMetric("request_end", {
            status: 200,
            latencyMs: Date.now() - startedAt,
            streamedTokenCount,
            toolInvocations: toolRouting.requestedTools.length,
            toolFailures: toolRouting.fallbackTools.length,
            outcome: "streamed",
          })
          controller.close()
        }
      },
    })

    logApiEvent("info", "chat.post.stream_started", {
      requestId,
      route: "/api/chat",
      method: "POST",
      userId: session.user.id,
      details: {
        context,
        messageCount: messages.length,
        provider: result.provider,
        model: result.model,
        requestedTools: toolRouting.requestedTools,
        fallbackTools: toolRouting.fallbackTools,
        attachmentCount: normalizedAttachmentIds.length || attachments?.length || 0,
        retryMode: retry?.mode ?? "auto",
      },
    })

    return new Response(stream, {
      headers: {
        "x-request-id": requestId,
        "content-type": "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    if (error instanceof AIProviderError) {
      const status = error.code === "BAD_REQUEST" ? 400 : error.code === "UNSUPPORTED_FEATURE" ? 422 : error.code === "TIMEOUT" ? 504 : 503
      const message =
        error.code === "UNSUPPORTED_FEATURE"
          ? "Selected model does not support this feature. Please choose a text-capable model."
          : error.message

      logMetric("request_end", { status, latencyMs: Date.now() - startedAt, outcome: "provider_error", errorCode: error.code }, "warn")
      return respondError(
        request,
        { code: error.code === "TIMEOUT" ? CHAT_ERROR_CODES.PROVIDER_TIMEOUT : error.code, message },
        { status, legacy: { error: message }, requestId },
      )
    }

    logApiEvent("error", "chat.post.failed", {
      requestId,
      route: "/api/chat",
      method: "POST",
      details: {},
      error,
    })

    logMetric("request_end", { status: 500, latencyMs: Date.now() - startedAt, outcome: "failed" }, "error")
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
    getChatMessages: Database.getChatMessages.bind(Database),
    respondError: (error, options) => respondError(request, error, { ...options, requestId }),
    respondSuccess: (data, options) => respondSuccess(request, data, { ...options, requestId }),
  })
}
