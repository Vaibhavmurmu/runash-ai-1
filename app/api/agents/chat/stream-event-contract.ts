import { z } from "zod"

const toolBaseEventSchema = z.object({
  tool: z.string().trim().min(1),
  executionId: z.string().trim().min(1),
  messageId: z.string().trim().min(1).optional(),
})

const toolStartPayloadSchema = toolBaseEventSchema.extend({
  startedAt: z.string().datetime(),
  timeoutMs: z.number().int().positive().optional(),
  retryCount: z.number().int().min(0).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const toolResultPayloadSchema = toolBaseEventSchema.extend({
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().int().min(0).optional(),
  fromCache: z.boolean().optional(),
  attempts: z.number().int().min(0).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
})

const toolErrorPayloadSchema = toolBaseEventSchema.extend({
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().int().min(0).optional(),
  errorCode: z.string().trim().min(1),
  errorMessage: z.string().trim().min(1),
  failureReason: z.string().trim().min(1).optional(),
  attempts: z.number().int().min(0).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type ToolStartEventPayload = z.infer<typeof toolStartPayloadSchema>
export type ToolResultEventPayload = z.infer<typeof toolResultPayloadSchema>
export type ToolErrorEventPayload = z.infer<typeof toolErrorPayloadSchema>

export function encodeChatStreamEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function normalizeToolStartEventPayload(input: Record<string, unknown>): ToolStartEventPayload {
  return toolStartPayloadSchema.parse(input)
}

export function normalizeToolResultEventPayload(input: Record<string, unknown>): ToolResultEventPayload {
  return toolResultPayloadSchema.parse(input)
}

export function normalizeToolErrorEventPayload(input: Record<string, unknown>): ToolErrorEventPayload {
  return toolErrorPayloadSchema.parse(input)
}
