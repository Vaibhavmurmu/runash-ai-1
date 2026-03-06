import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import { rateLimit } from "@/lib/rate-limit"
import {
  createAgentMessage,
  createAgentMessageAttachments,
  findAgentMessagesByClientRequestId,
  upsertAgentSession,
  updateAgentMessage,
  type AgentMessageMetadata,
} from "@/lib/repositories/agent-orchestration"
import { RELAY_AGENT_TOOLS } from "@/lib/skills/relay-tool-registry"
import { AGENT_ROLES } from "@/services/agent-role-orchestration"
import {
  AgentOrchestrationService,
  ToolExecutionError,
  resolveToolExecutionPolicy,
  type SupportedTool,
} from "@/services/agent-orchestration-service"
import { enqueueToolJob } from "@/services/agent-tool-queue-worker"
import { AIProviderError, resolveModelSelection, streamModelTextWithFallback } from "@/lib/ai/provider-registry"
import { buildDefaultToolPayloads, buildToolPlan, resolveRunAshChatToolSelection } from "./chat-request-handler"
import { CHAT_ERROR_CODES, chatAttachmentSchema, clientRequestIdSchema, streamRetrySchema } from "@/lib/chat-contracts"

const requestSchema = z.object({
  agentRole: z.enum(AGENT_ROLES).default("broker"),
  preferences: z
    .object({
      prioritizeSustainability: z.boolean().optional(),
      maxBudgetMinor: z.number().int().nonnegative().optional(),
      minMarginPercent: z.number().min(0).max(100).optional(),
      urgencyLevel: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
  sessionId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1).max(5000),
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  tools: z.array(z.enum(RELAY_AGENT_TOOLS)).default([]),
  toolPayloads: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  attachments: z.array(chatAttachmentSchema).max(3).optional(),
  clientRequestId: clientRequestIdSchema.optional(),
  retry: streamRetrySchema.optional(),
})

const AGENT_CHAT_ENABLED = process.env.RUNASH_AGENT_CHAT_ENABLED !== "false"


const mapToolErrorToChatErrorCode = (errorCode: string | undefined) => {
  if (errorCode === "TOOL_TIMEOUT") return CHAT_ERROR_CODES.TOOL_TIMEOUT
  if (errorCode === "TOOL_MAX_RETRIES_EXCEEDED") return CHAT_ERROR_CODES.TOOL_MAX_RETRIES_EXCEEDED
  if (errorCode === "TOOL_EXECUTION_FAILED") return CHAT_ERROR_CODES.TOOL_EXECUTION_FAILED
  return CHAT_ERROR_CODES.PROVIDER_TIMEOUT
}

const formatToolOutputPreview = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed.slice(0, 240) : undefined
  }

  try {
    const serialized = JSON.stringify(value)
    if (!serialized || serialized === "{}" || serialized === "[]") return undefined
    return serialized.slice(0, 240)
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  if (!AGENT_CHAT_ENABLED) {
    return NextResponse.json({ error: "Agent APIs disabled", requestId }, { status: 404 })
  }

  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED, requestId }, { status: 401 })
    }

    const userId = String(session.user.id)
    await AgentOrchestrationService.runRetentionSweep()
    const throttle = AgentOrchestrationService.enforceAdaptiveThrottle(`agents-chat:${userId}`, 45, 60_000)
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Adaptive throttle limit exceeded", code: CHAT_ERROR_CODES.RATE_LIMITED, requestId }, { status: 429 })
    }

    const rateLimitResult = await rateLimit(request, `agents-chat:${userId}`, 30, 60)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded", code: CHAT_ERROR_CODES.RATE_LIMITED, requestId }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      const hasAttachmentIssue = parsed.error.issues.some((issue) => issue.path.includes("attachments"))
      return NextResponse.json({ error: hasAttachmentIssue ? "Invalid attachment metadata" : "Invalid request payload", code: hasAttachmentIssue ? CHAT_ERROR_CODES.INVALID_ATTACHMENT : CHAT_ERROR_CODES.INVALID_REQUEST, details: parsed.error.flatten(), requestId }, { status: 400 })
    }

    const sanitizedMessage = AgentOrchestrationService.sanitizeUserInput(parsed.data.message)
    if (AgentOrchestrationService.hasPromptInjection(sanitizedMessage)) {
      return NextResponse.json({ error: "Prompt rejected by safety policy", requestId }, { status: 400 })
    }

    const agentSession = await upsertAgentSession(userId, parsed.data.sessionId, parsed.data.title)

    if (parsed.data.clientRequestId) {
      const existingMessages = await findAgentMessagesByClientRequestId(agentSession.id, parsed.data.clientRequestId)
      const existingAssistant = existingMessages.find((entry) => entry.role === "assistant" && entry.status === "completed")
      if (existingAssistant) {
        return NextResponse.json({
          deduped: true,
          requestId,
          sessionId: agentSession.id,
          messageId: existingAssistant.id,
          content: existingAssistant.content,
        })
      }
    }

    const userMessage = await createAgentMessage(agentSession.id, "user", sanitizedMessage, "completed", { clientRequestId: parsed.data.clientRequestId })
    const assistantMessage = await createAgentMessage(agentSession.id, "assistant", "", "queued", { clientRequestId: parsed.data.clientRequestId })

    if (parsed.data.attachments?.length) {
      await createAgentMessageAttachments({
        sessionId: agentSession.id,
        messageId: userMessage.id,
        attachments: parsed.data.attachments,
      })
    }

    const selection = resolveModelSelection(parsed.data.model, parsed.data.provider)
    const encoder = new TextEncoder()

    const eventStream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        const toolExecutionSummaries = new Map<string, Record<string, unknown>>()

        try {
          send("final", { type: "meta", status: "queued", sessionId: agentSession.id, requestId })
          await updateAgentMessage(assistantMessage.id, { status: "streaming" })

          const toolOutputs: Record<string, unknown> = {}
          const selectedTools = resolveRunAshChatToolSelection(
            sanitizedMessage,
            parsed.data.tools as SupportedTool[],
          )
          const toolPlan = buildToolPlan(selectedTools)
          const defaultPayloads = await buildDefaultToolPayloads({
            message: sanitizedMessage,
            sessionId: agentSession.id,
            requestedTools: selectedTools,
            authSession: session,
          })
          const checkoutValidation = defaultPayloads?.checkout_validation as
            | { status: "blocked"; missing_fields: string[]; next_action: string }
            | undefined

          if (checkoutValidation?.status === "blocked") {
            send("tool_result", {
              tool: "initiate_link_checkout",
              result: {
                status: "blocked",
                reason: "missing_checkout_context",
                missing_fields: checkoutValidation.missing_fields,
                next_action: checkoutValidation.next_action,
              },
              fromCache: false,
            })
          }

          for (const tool of toolPlan.immediate) {
            if (tool === "initiate_link_checkout" && checkoutValidation?.status === "blocked") {
              continue
            }
            const toolExecutionId = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const startedAt = new Date().toISOString()
            const toolPolicy = resolveToolExecutionPolicy(tool)
            toolExecutionSummaries.set(toolExecutionId, {
              id: toolExecutionId,
              tool,
              status: "running",
              startedAt,
              progressLabel: `Running ${tool.replace(/_/g, " ")}`,
              timeoutMs: toolPolicy.timeoutMs,
              retryCount: toolPolicy.retryCount,
              attempts: 0,
            })
            send("tool_start", {
              tool,
              messageId: assistantMessage.id,
              status: "tool-running",
              executionId: toolExecutionId,
              startedAt,
              timeoutMs: toolPolicy.timeoutMs,
              retryCount: toolPolicy.retryCount,
            })

            const payload = parsed.data.toolPayloads?.[tool] ?? defaultPayloads?.[tool] ?? { query: sanitizedMessage }
            try {
              const execution = await AgentOrchestrationService.executeToolWithPolicy(
                tool,
                payload,
                {
                  sessionId: agentSession.id,
                  messageId: assistantMessage.id,
                  tenantId: userId,
                  role: parsed.data.agentRole,
                  preferences: parsed.data.preferences,
                },
                toolPolicy,
              )

              toolOutputs[tool] = execution.result
              const summaryEntry = [...toolExecutionSummaries.values()].reverse().find((entry) => entry.tool === tool && entry.status === "running")
              const finishedAt = new Date().toISOString()
              if (summaryEntry) {
                const startedAt = typeof summaryEntry.startedAt === "string" ? summaryEntry.startedAt : finishedAt
                summaryEntry.status = "completed"
                summaryEntry.finishedAt = finishedAt
                summaryEntry.durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
                summaryEntry.progressLabel = execution.fromCache ? `${tool.replace(/_/g, " ")} (cache)` : `${tool.replace(/_/g, " ")} complete`
                summaryEntry.outputPreview = formatToolOutputPreview(execution.result)
                summaryEntry.attempts = toolPolicy.retryCount + 1
              }
              send("tool_result", {
                tool,
                result: execution.result,
                fromCache: execution.fromCache,
                executionId: summaryEntry?.id,
                timeoutMs: toolPolicy.timeoutMs,
                retryCount: toolPolicy.retryCount,
              })

              logApiEvent("info", "agents.chat.tool.result", {
                requestId,
                route: "/api/agents/chat",
                method: "POST",
                userId,
                details: {
                  tool,
                  executionId: summaryEntry?.id,
                  status: "completed",
                  timeoutMs: toolPolicy.timeoutMs,
                  retryCount: toolPolicy.retryCount,
                  fromCache: execution.fromCache,
                },
              })
            } catch (toolError) {
              const errorCode = toolError instanceof ToolExecutionError ? toolError.code : "TOOL_EXECUTION_FAILED"
              const summaryEntry = [...toolExecutionSummaries.values()].reverse().find((entry) => entry.tool === tool && entry.status === "running")
              const finishedAt = new Date().toISOString()
              if (summaryEntry) {
                const startedAt = typeof summaryEntry.startedAt === "string" ? summaryEntry.startedAt : finishedAt
                summaryEntry.status = "failed"
                summaryEntry.finishedAt = finishedAt
                summaryEntry.durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
                summaryEntry.progressLabel = `${tool.replace(/_/g, " ")} failed`
                summaryEntry.errorCode = errorCode
                summaryEntry.errorMessage = toolError instanceof Error ? toolError.message : "Tool execution failed"
                summaryEntry.failureReason = errorCode
                summaryEntry.attempts = toolPolicy.retryCount + 1
              }

              send("tool_result", {
                tool,
                executionId: summaryEntry?.id,
                fromCache: false,
                timeoutMs: toolPolicy.timeoutMs,
                retryCount: toolPolicy.retryCount,
                errorCode,
                failureReason: errorCode,
                result: {
                  status: "failed",
                  code: errorCode,
                },
              })

              logApiEvent("warn", "agents.chat.tool.result", {
                requestId,
                route: "/api/agents/chat",
                method: "POST",
                userId,
                details: {
                  tool,
                  executionId: summaryEntry?.id,
                  status: "failed",
                  errorCode,
                  timeoutMs: toolPolicy.timeoutMs,
                  retryCount: toolPolicy.retryCount,
                },
              })

              throw toolError
            }
          }

          for (const tool of toolPlan.queued) {
            if (tool === "initiate_link_checkout" && checkoutValidation?.status === "blocked") {
              continue
            }
            const toolExecutionId = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const startedAt = new Date().toISOString()
            const toolPolicy = resolveToolExecutionPolicy(tool)
            toolExecutionSummaries.set(toolExecutionId, {
              id: toolExecutionId,
              tool,
              status: "running",
              startedAt,
              progressLabel: `Queueing ${tool.replace(/_/g, " ")}`,
              timeoutMs: toolPolicy.timeoutMs,
              retryCount: toolPolicy.retryCount,
              attempts: 0,
            })
            send("tool_start", { tool, messageId: assistantMessage.id, status: "tool-running", executionId: toolExecutionId, startedAt, timeoutMs: toolPolicy.timeoutMs, retryCount: toolPolicy.retryCount })
            const payload = parsed.data.toolPayloads?.[tool] ?? defaultPayloads?.[tool] ?? { query: sanitizedMessage }
            const jobId = enqueueToolJob({
              tool,
              payload,
              context: {
                sessionId: agentSession.id,
                messageId: assistantMessage.id,
                tenantId: userId,
              },
            })

            const summaryEntry = [...toolExecutionSummaries.values()].reverse().find((entry) => entry.tool === tool && entry.status === "running")
            const finishedAt = new Date().toISOString()
            if (summaryEntry) {
              const startedAt = typeof summaryEntry.startedAt === "string" ? summaryEntry.startedAt : finishedAt
              summaryEntry.status = "completed"
              summaryEntry.finishedAt = finishedAt
              summaryEntry.durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
              summaryEntry.progressLabel = `${tool.replace(/_/g, " ")} queued`
              summaryEntry.outputPreview = `Queued job ${jobId}`
              summaryEntry.attempts = 0
            }
            send("tool_result", {
              tool,
              result: { queued: true, jobId },
              fromCache: false,
              executionId: summaryEntry?.id,
              timeoutMs: toolPolicy.timeoutMs,
              retryCount: toolPolicy.retryCount,
              attempts: 0,
            })
            logApiEvent("info", "agents.chat.tool.result", {
              requestId,
              route: "/api/agents/chat",
              method: "POST",
              userId,
              details: {
                tool,
                executionId: summaryEntry?.id,
                status: "queued",
                timeoutMs: toolPolicy.timeoutMs,
                retryCount: toolPolicy.retryCount,
              },
            })
          }

          const completion = await streamModelTextWithFallback(selection, {
            system:
              "You are RunAsh Agent. Keep answers concise, safe, and avoid exposing secrets. If tools are provided, ground your answer in tool results.",
            messages: [
              { role: "user", content: `User prompt: ${sanitizedMessage}` },
              {
                role: "system",
                content: `Attachment metadata: ${JSON.stringify(parsed.data.attachments ?? [])}`,
              },
              { role: "system", content: `Tool outputs: ${JSON.stringify(toolOutputs)}` },
            ],
            temperature: 0.4,
            maxTokens: 700,
          })

          let fullText = ""
          for await (const token of completion.textStream) {
            fullText += token
            send("token", { token, messageId: assistantMessage.id, provider: completion.provider, model: completion.model, requestId })
          }

          await updateAgentMessage(assistantMessage.id, {
            status: "completed",
            content: fullText,
            metadata: { toolExecutions: [...toolExecutionSummaries.values()] } satisfies AgentMessageMetadata,
          })
          send("final", {
            type: "final",
            status: "completed",
            sessionId: agentSession.id,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
            content: fullText,
            provider: completion.provider,
            model: completion.model,
            requestId,
          })
        } catch (error) {
          const providerErrorCode = error instanceof AIProviderError ? error.code : undefined
          const activeSummary = [...toolExecutionSummaries.values()].reverse().find((entry) => entry.status === "running")
          if (activeSummary) {
            const finishedAt = new Date().toISOString()
            const startedAt = typeof activeSummary.startedAt === "string" ? activeSummary.startedAt : finishedAt
            activeSummary.status = "failed"
            activeSummary.finishedAt = finishedAt
            activeSummary.durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
            activeSummary.progressLabel = `${String(activeSummary.tool ?? "tool").replace(/_/g, " ")} failed`
            activeSummary.errorCode =
              (error instanceof ToolExecutionError ? error.code : providerErrorCode) ?? "PROVIDER_ERROR"
            activeSummary.failureReason = activeSummary.errorCode
            activeSummary.errorMessage = "Unable to complete tool execution"
          }

          await updateAgentMessage(assistantMessage.id, {
            status: "failed",
            metadata: { toolExecutions: [...toolExecutionSummaries.values()] } satisfies AgentMessageMetadata,
          })


          send("error", {
            message: "Unable to complete agent turn",
            requestId,
            code:
              providerErrorCode === "TIMEOUT"
                ? CHAT_ERROR_CODES.PROVIDER_TIMEOUT
                : providerErrorCode ?? mapToolErrorToChatErrorCode(activeSummary?.errorCode as string | undefined),
          })

          logApiEvent("error", "agents.chat.stream_failed", {
            requestId,
            route: "/api/agents/chat",
            method: "POST",
            userId,
            details: {},
            error,
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(eventStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-request-id": requestId,
        "x-provider": selection.provider,
      },
    })
  } catch (error) {
    logApiEvent("error", "agents.chat.failed", {
      requestId,
      route: "/api/agents/chat",
      method: "POST",
      details: {},
      error,
    })

    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 })
  }
}
