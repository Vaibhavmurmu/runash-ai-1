import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import {
  getCurrentPeriodUsage,
  getUsageSummary,
  incrementUsage,
  ingestUsageEvent,
  ingestUsageEventsBatch,
  previewUsageCosts,
  type UsageEventIngestionInput,
  type UsageMetric,
} from "@/lib/billing-usage"
import {
  usageCostPreviewSchema,
  usageEventBatchSchema,
  usageEventSchema,
  type UsageEventSchemaOutput,
} from "@/lib/validations/billing-usage"

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
    metadata: input.metadata,
    pricingModel: input.pricingModel,
  }
}

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const mode = request.nextUrl.searchParams.get("mode")
  if (mode === "current_period") {
    const subscriptionId = request.nextUrl.searchParams.get("subscription_id")
    const usage = await getCurrentPeriodUsage(sessionUser.userId, subscriptionId)
    return respondSuccess(request, { mode, ...usage })
  }

  const plan = (request.nextUrl.searchParams.get("plan") || "free") as any
  const period = request.nextUrl.searchParams.get("period") || undefined
  const summary = await getUsageSummary(sessionUser.userId, plan, period)
  return respondSuccess(request, { mode: "summary", ...summary })
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return respondError(request, { code: "INVALID_REQUEST", message: "Invalid body" }, { status: 400 })
  }

  const legacyRecord = body as Record<string, unknown>
  if (typeof legacyRecord.metric === "string" && typeof legacyRecord.amount === "number") {
    await incrementUsage({
      userId: sessionUser.userId,
      metric: legacyRecord.metric as UsageMetric,
      amount: legacyRecord.amount,
      period: legacyRecord.period as string | undefined,
    })

    return respondSuccess(request, { ok: true, mode: "legacy" })
  }

  const previewParse = usageCostPreviewSchema.safeParse(body)
  if (previewParse.success) {
    const preview = previewUsageCosts(
      previewParse.data.events.map((event) => {
        const normalized = usageEventSchema.parse(event)
        return {
          promptTokens: normalized.promptTokens,
          completionTokens: normalized.completionTokens,
          totalTokens: normalized.totalTokens,
          deltaMs: normalized.deltaMs,
          pricingModel: normalized.pricingModel,
        }
      }),
    )

    return respondSuccess(request, { ok: true, mode: "cost_preview", ...preview })
  }

  const eventValidation = usageEventSchema.safeParse(body)
  if (!eventValidation.success) {
    return respondError(
      request,
      {
        code: "INVALID_REQUEST",
        message: "Expected legacy metric payload, cost preview payload, or valid usage event payload",
        details: eventValidation.error.flatten(),
      },
      { status: 400 },
    )
  }

  const result = await ingestUsageEvent(toIngestionEvent(eventValidation.data, sessionUser))
  return respondSuccess(request, { ok: true, mode: "single", ...result })
}

export async function PUT(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  const parsed = usageEventBatchSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(
      request,
      { code: "INVALID_REQUEST", message: "events array is required", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const normalizedEvents = parsed.data.events.map((event) => toIngestionEvent(usageEventSchema.parse(event), sessionUser))
  const result = await ingestUsageEventsBatch(normalizedEvents)
  return respondSuccess(request, { ok: true, mode: "batch", ...result })
}

export const dynamic = "force-dynamic"
