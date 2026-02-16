import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { ingestUsageEvent, ingestUsageEventsBatch, type UsageEventIngestionInput } from "@/lib/billing-usage"
import { usageEventBatchSchema, usageEventSchema, type UsageEventSchemaOutput } from "@/lib/validations/billing-usage"

function toIngestionEvent(input: UsageEventSchemaOutput, sessionUser: { userId: string }): UsageEventIngestionInput {
  return {
    eventId: input.eventId,
    customerId: sessionUser.userId,
    subscriptionId: input.subscriptionId,
    userId: sessionUser.userId,
    occurredAt: input.occurredAt,
    model: input.model,
    resolver: input.resolver,
    resolverId: input.resolverId,
    resolverType: input.resolverType,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    deltaMs: input.deltaMs,
    metadata: {
      ...(input.metadata ?? {}),
      ingestionSource: "manual_or_batch_api",
    },
    pricingModel: input.pricingModel,
  }
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  const parsed = usageEventSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "INVALID_USAGE_EVENT", message: "Invalid usage event payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await ingestUsageEvent(toIngestionEvent(parsed.data, sessionUser))
  return respondSuccess(request, { ok: true, mode: "manual", ...result })
}

export async function PUT(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  const parsed = usageEventBatchSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_USAGE_EVENT_BATCH", message: "Invalid usage event batch payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const normalizedEvents = parsed.data.events.map((event) => toIngestionEvent(usageEventSchema.parse(event), sessionUser))
  const result = await ingestUsageEventsBatch(normalizedEvents)
  return respondSuccess(request, { ok: true, mode: "batch", ...result })
}
