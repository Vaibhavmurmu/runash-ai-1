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
import {
  encodeChatStreamEvent,
  normalizeToolErrorEventPayload,
  normalizeToolResultEventPayload,
  normalizeToolStartEventPayload,
} from "./stream-event-contract"

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

const STREAM_CHECKPOINT_INTERVAL = 48

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const requestStartedAt = Date.now()
  const route = "/api/agents/chat"

  const logMetric = (name: string, details: Record<string, unknown>, level: "info" | "warn" | "error" = "info") => {
    logApiEvent(level, `agents.chat.metric.${name}`, {
      requestId,
      route,
      method: "POST",
      details,
    })
  }

  if (!AGENT_CHAT_ENABLED) {
    logMetric("request_end", {
      status: 404,
      latencyMs: Date.now() - requestStartedAt,
      outcome: "disabled",
    })
    return NextResponse.json({ error: "Agent APIs disabled", requestId }, { status: 404 })
  }

  logMetric("request_start", { status: "started" })

  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      logMetric("auth_rejection", {
        reason: "missing_session",
        status: 401,
      }, "warn")
      logMetric("request_end", {
        status: 401,
        latencyMs: Date.now() - requestStartedAt,
        outcome: "rejected",
      }, "warn")
      return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED, requestId }, { status: 401 })
    }

    const userId = String(session.user.id)
    await AgentOrchestrationService.runRetentionSweep()
    const throttle = AgentOrchestrationService.enforceAdaptiveThrottle(`agents-chat:${userId}`, 45, 60_000)
    if (!throttle.allowed) {
      logMetric("request_end", {
        status: 429,
        latencyMs: Date.now() - requestStartedAt,
        outcome: "adaptive_throttled",
      }, "warn")
      return NextResponse.json({ error: "Adaptive throttle limit exceeded", code: CHAT_ERROR_CODES.RATE_LIMITED, requestId }, { status: 429 })
    }

    const rateLimitResult = await rateLimit(request, `agents-chat:${userId}`, 30, 60)
    if (!rateLimitResult.success) {
      logMetric("request_end", {
        status: 429,
        latencyMs: Date.now() - requestStartedAt,
        outcome: "rate_limited",
      }, "warn")
      return NextResponse.json({ error: "Rate limit exceeded", code: CHAT_ERROR_CODES.RATE_LIMITED, requestId }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      const hasAttachmentIssue = parsed.error.issues.some((issue) => issue.path.includes("attachments"))
      logMetric("request_end", {
        status: 400,
        latencyMs: Date.now() - requestStartedAt,
        outcome: hasAttachmentIssue ? "invalid_attachment" : "invalid_request",
      }, "warn")
      return NextResponse.json({ error: hasAttachmentIssue ? "Invalid attachment metadata" : "Invalid request payload", code: hasAttachmentIssue ? CHAT_ERROR_CODES.INVALID_ATTACHMENT : CHAT_ERROR_CODES.INVALID_REQUEST, details: parsed.error.flatten(), requestId }, { status: 400 })
    }

    const sanitizedMessage = AgentOrchestrationService.sanitizeUserInput(parsed.data.message)
    if (AgentOrchestrationService.hasPromptInjection(sanitizedMessage)) {
      logMetric("request_end", {
        status: 400,
        latencyMs: Date.now() - requestStartedAt,
        outcome: "prompt_rejected",
      }, "warn")
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

    const selection = resolveModelSelection(parsed.data.model, parsed.data.provider)

    const userMessage = await createAgentMessage(agentSession.id, "user", sanitizedMessage, "completed", { clientRequestId: parsed.data.clientRequestId })
    const assistantMessage = await createAgentMessage(agentSession.id, "assistant", "", "queued", {
      clientRequestId: parsed.data.clientRequestId,
      metadata: {
        request_id: requestId,
        provider: selection.provider,
        model: selection.model,
        retry_mode: parsed.data.retry?.mode ?? "auto",
      },
    })

    if (parsed.data.attachments?.length) {
      await createAgentMessageAttachments({
        sessionId: agentSession.id,
        messageId: userMessage.id,
        attachments: parsed.data.attachments,
      })
    }

    const encoder = new TextEncoder()

    const eventStream = new ReadableStream({
      async start(controller) {
        const streamStartedAt = Date.now()
        let streamedTokenCount = 0
        let toolInvocations = 0
        let toolFailures = 0

        const send = (event: string, data: Record<string, unknown>) => {
          if (event === "tool_start") {
            controller.enqueue(encoder.encode(encodeChatStreamEvent(event, normalizeToolStartEventPayload(data))))
            return
          }

          if (event === "tool_result") {
            controller.enqueue(encoder.encode(encodeChatStreamEvent(event, normalizeToolResultEventPayload(data))))
            return
          }

          if (event === "tool_error") {
            controller.enqueue(encoder.encode(encodeChatStreamEvent(event, normalizeToolErrorEventPayload(data))))
            return
          }

          controller.enqueue(encoder.encode(encodeChatStreamEvent(event, data)))
        }

        const toolExecutionSummaries = new Map<string, Record<string, unknown>>()

        try {
          send("final", { type: "meta", status: "queued", sessionId: agentSession.id, requestId })
          await updateAgentMessage(assistantMessage.id, {
            status: "streaming",
            metadata: {
              request_id: requestId,
              provider: selection.provider,
              model: selection.model,
              retry_mode: parsed.data.retry?.mode ?? "auto",
            },
          })

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
            const blockedFinishedAt = new Date().toISOString()
            send("tool_result", {
              tool: "initiate_link_checkout",
              executionId: `initiate_link_checkout-blocked-${Date.now()}`,
              messageId: assistantMessage.id,
              finishedAt: blockedFinishedAt,
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
            toolInvocations += 1
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
                executionId: summaryEntry?.id ?? toolExecutionId,
                messageId: assistantMessage.id,
                startedAt,
                finishedAt,
                durationMs: summaryEntry?.durationMs as number | undefined,
                result: execution.result,
                fromCache: execution.fromCache,
                attempts: toolPolicy.retryCount + 1,
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
              toolFailures += 1
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

              send("tool_error", {
                tool,
                executionId: summaryEntry?.id ?? toolExecutionId,
                messageId: assistantMessage.id,
                startedAt: summaryEntry?.startedAt,
                finishedAt,
                durationMs: summaryEntry?.durationMs as number | undefined,
                errorCode,
                errorMessage: toolError instanceof Error ? toolError.message : "Tool execution failed",
                failureReason: errorCode,
                attempts: toolPolicy.retryCount + 1,
                payload,
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
            toolInvocations += 1
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
            const payload = parsed.data.toolPayloads?.[tool] ?? defaultPayloads?.[tool] ?? { query: sanitizedMessage }
            send("tool_start", {
              tool,
              messageId: assistantMessage.id,
              executionId: toolExecutionId,
              startedAt,
              timeoutMs: toolPolicy.timeoutMs,
              retryCount: toolPolicy.retryCount,
              payload,
            })
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
              executionId: summaryEntry?.id ?? toolExecutionId,
              messageId: assistantMessage.id,
              startedAt,
              finishedAt,
              durationMs: summaryEntry?.durationMs as number | undefined,
              result: { queued: true, jobId },
              fromCache: false,
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
            streamedTokenCount += 1
            if (streamedTokenCount % STREAM_CHECKPOINT_INTERVAL === 0) {
              await updateAgentMessage(assistantMessage.id, {
                status: "streaming",
                content: fullText,
                metadata: {
                  request_id: requestId,
                  provider: completion.provider,
                  model: completion.model,
                  retry_mode: parsed.data.retry?.mode ?? "auto",
                  toolExecutions: [...toolExecutionSummaries.values()],
                } satisfies AgentMessageMetadata,
              })
            }
            send("token", { token, messageId: assistantMessage.id, provider: completion.provider, model: completion.model, requestId })
          }

          await updateAgentMessage(assistantMessage.id, {
            status: "completed",
            content: fullText,
            metadata: {
              request_id: requestId,
              provider: completion.provider,
              model: completion.model,
              retry_mode: parsed.data.retry?.mode ?? "auto",
              toolExecutions: [...toolExecutionSummaries.values()],
            } satisfies AgentMessageMetadata,
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

          const terminalStatus = providerErrorCode === "ABORTED" ? "cancelled" : "failed"
          const terminalErrorCode =
            providerErrorCode === "TIMEOUT"
              ? CHAT_ERROR_CODES.PROVIDER_TIMEOUT
              : providerErrorCode ?? mapToolErrorToChatErrorCode(activeSummary?.errorCode as string | undefined)

          await updateAgentMessage(assistantMessage.id, {
            status: terminalStatus,
            metadata: {
              request_id: requestId,
              provider: selection.provider,
              model: selection.model,
              retry_mode: parsed.data.retry?.mode ?? "auto",
              error_code: terminalErrorCode,
              toolExecutions: [...toolExecutionSummaries.values()],
            } satisfies AgentMessageMetadata,
          })


          send("error", {
            message: "Unable to complete agent turn",
            requestId,
            code: terminalErrorCode,
            status: terminalStatus,
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
          logMetric("stream_summary", {
            durationMs: Date.now() - streamStartedAt,
            streamedTokenCount,
            toolInvocations,
            toolFailures,
          })
          logMetric("request_end", {
            status: 200,
            latencyMs: Date.now() - requestStartedAt,
            streamedTokenCount,
            toolInvocations,
            toolFailures,
            outcome: "streamed",
          })
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

    logMetric("request_end", {
      status: 500,
      latencyMs: Date.now() - requestStartedAt,
      outcome: "failed",
    }, "error")

    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 })
  }
}
