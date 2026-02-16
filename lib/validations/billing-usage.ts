import { z } from "zod"

export const usagePricingModelSchema = z.discriminatedUnion("strategy", [
  z
    .object({
      strategy: z.literal("token"),
      promptTokenRate: z.number().nonnegative(),
      completionTokenRate: z.number().nonnegative(),
      minimumCharge: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      strategy: z.literal("execution_time"),
      millisecondRate: z.number().nonnegative(),
      minimumCharge: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      strategy: z.literal("hybrid"),
      promptTokenRate: z.number().nonnegative(),
      completionTokenRate: z.number().nonnegative(),
      millisecondRate: z.number().nonnegative(),
      minimumCharge: z.number().nonnegative().optional(),
    })
    .strict(),
])

const rawUsageEventSchema = z
  .object({
    event_id: z.string().min(1).optional(),
    eventId: z.string().min(1).optional(),
    subscription_id: z.string().min(1).optional(),
    subscriptionId: z.string().min(1).optional(),
    occurred_at: z.string().datetime().optional(),
    occurredAt: z.string().datetime().optional(),
    model: z.string().min(1).optional(),
    resolver: z.string().min(1).optional(),
    resolver_id: z.string().min(1).optional(),
    resolverId: z.string().min(1).optional(),
    resolver_type: z.enum(["builtin", "custom", "external"]).optional(),
    resolverType: z.enum(["builtin", "custom", "external"]).optional(),
    prompt_tokens: z.number().int().nonnegative().optional(),
    promptTokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    completionTokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
    delta_ms: z.number().int().nonnegative().optional(),
    deltaMs: z.number().int().nonnegative().optional(),
    metadata: z.record(z.unknown()).optional(),
    pricingModel: usagePricingModelSchema,
  })
  .strict()

export const usageEventSchema = rawUsageEventSchema
  .superRefine((value, ctx) => {
    if (!value.event_id && !value.eventId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "event_id or eventId is required" })
    }

    if (typeof value.prompt_tokens !== "number" && typeof value.promptTokens !== "number") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "prompt_tokens or promptTokens is required" })
    }

    if (typeof value.completion_tokens !== "number" && typeof value.completionTokens !== "number") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "completion_tokens or completionTokens is required" })
    }

    if (typeof value.delta_ms !== "number" && typeof value.deltaMs !== "number") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "delta_ms or deltaMs is required" })
    }
  })
  .transform((value) => ({
    eventId: value.event_id ?? value.eventId!,
    subscriptionId: value.subscription_id ?? value.subscriptionId ?? null,
    occurredAt: value.occurred_at ?? value.occurredAt,
    model: value.model ?? null,
    resolver: value.resolver ?? null,
    resolverId: value.resolver_id ?? value.resolverId ?? null,
    resolverType: value.resolver_type ?? value.resolverType ?? null,
    promptTokens: value.prompt_tokens ?? value.promptTokens ?? 0,
    completionTokens: value.completion_tokens ?? value.completionTokens ?? 0,
    totalTokens: value.total_tokens ?? value.totalTokens,
    deltaMs: value.delta_ms ?? value.deltaMs ?? 0,
    metadata: value.metadata ?? {},
    pricingModel: value.pricingModel,
  }))

export const usageEventBatchSchema = z
  .object({
    events: z.array(rawUsageEventSchema).min(1),
  })
  .strict()

export const usageCostPreviewSchema = z
  .object({
    mode: z.literal("cost_preview"),
    events: z.array(rawUsageEventSchema).min(1),
  })
  .strict()

export type UsageEventSchemaOutput = z.output<typeof usageEventSchema>
