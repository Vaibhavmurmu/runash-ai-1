import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import {
  getUsageSummary,
  incrementUsage,
  ingestUsageEvent,
  ingestUsageEventsBatch,
  type UsageEventIngestionInput,
  type UsageMetric,
  type UsagePricingModel,
  type UsageResolverType,
} from "@/lib/billing-usage"

function normalizePricingModel(raw: unknown): UsagePricingModel | null {
  if (!raw || typeof raw !== "object") return null

  const model = raw as Record<string, unknown>
  const strategy = model.strategy
  if (strategy === "token") {
    if (typeof model.promptTokenRate !== "number" || typeof model.completionTokenRate !== "number") return null
    return {
      strategy,
      promptTokenRate: model.promptTokenRate,
      completionTokenRate: model.completionTokenRate,
      minimumCharge: typeof model.minimumCharge === "number" ? model.minimumCharge : undefined,
    }
  }

  if (strategy === "execution_time") {
    if (typeof model.millisecondRate !== "number") return null
    return {
      strategy,
      millisecondRate: model.millisecondRate,
      minimumCharge: typeof model.minimumCharge === "number" ? model.minimumCharge : undefined,
    }
  }

  if (strategy === "hybrid") {
    if (
      typeof model.promptTokenRate !== "number" ||
      typeof model.completionTokenRate !== "number" ||
      typeof model.millisecondRate !== "number"
    ) {
      return null
    }
    return {
      strategy,
      promptTokenRate: model.promptTokenRate,
      completionTokenRate: model.completionTokenRate,
      millisecondRate: model.millisecondRate,
      minimumCharge: typeof model.minimumCharge === "number" ? model.minimumCharge : undefined,
    }
  }

  return null
}

function normalizeUsageEventPayload(
  body: unknown,
  sessionUser: { userId: string; organizationId?: number | null },
): UsageEventIngestionInput | null {
  if (!body || typeof body !== "object") return null
  const record = body as Record<string, unknown>
  const pricingModel = normalizePricingModel(record.pricingModel)

  if (
    typeof record.eventId !== "string" ||
    typeof record.promptTokens !== "number" ||
    typeof record.completionTokens !== "number" ||
    typeof record.deltaMs !== "number" ||
    !pricingModel
  ) {
    return null
  }

  const customerId = typeof record.customerId === "string" ? record.customerId : sessionUser.userId

  return {
    eventId: record.eventId,
    customerId,
    subscriptionId: typeof record.subscriptionId === "string" ? record.subscriptionId : null,
    userId: sessionUser.userId,
    occurredAt: typeof record.occurredAt === "string" ? record.occurredAt : undefined,
    model: typeof record.model === "string" ? record.model : null,
    resolver: typeof record.resolver === "string" ? record.resolver : null,
    resolverId: typeof record.resolverId === "string" ? record.resolverId : null,
    resolverType:
      record.resolverType === "builtin" || record.resolverType === "custom" || record.resolverType === "external"
        ? (record.resolverType as UsageResolverType)
        : null,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: typeof record.totalTokens === "number" ? record.totalTokens : undefined,
    deltaMs: record.deltaMs,
    metadata: record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : {},
    pricingModel,
  }
}

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const plan = (request.nextUrl.searchParams.get("plan") || "free") as any
  const period = request.nextUrl.searchParams.get("period") || undefined
  const summary = await getUsageSummary(sessionUser.userId, plan, period)
  return respondSuccess(request, summary)
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return respondError(request, { code: "INVALID_REQUEST", message: "Invalid body" }, { status: 400 })
  }

  const record = body as Record<string, unknown>

  if (typeof record.metric === "string" && typeof record.amount === "number") {
    await incrementUsage({
      userId: sessionUser.userId,
      metric: record.metric as UsageMetric,
      amount: record.amount,
      period: record.period as string | undefined,
    })

    return respondSuccess(request, { ok: true, mode: "legacy" })
  }

  const eventPayload = normalizeUsageEventPayload(body, sessionUser)
  if (!eventPayload) {
    return respondError(
      request,
      {
        code: "INVALID_REQUEST",
        message: "Expected legacy metric payload or usage event payload with pricingModel",
      },
      { status: 400 },
    )
  }

  const result = await ingestUsageEvent(eventPayload)
  return respondSuccess(request, { ok: true, mode: "single", ...result })
}

export async function PUT(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  const events = body && typeof body === "object" ? (body as Record<string, unknown>).events : null

  if (!Array.isArray(events) || events.length === 0) {
    return respondError(request, { code: "INVALID_REQUEST", message: "events array is required" }, { status: 400 })
  }

  const normalizedEvents = events.map((event) => normalizeUsageEventPayload(event, sessionUser))
  if (normalizedEvents.some((event) => !event)) {
    return respondError(request, { code: "INVALID_REQUEST", message: "One or more events are invalid" }, { status: 400 })
  }

  const result = await ingestUsageEventsBatch(normalizedEvents as UsageEventIngestionInput[])
  return respondSuccess(request, { ok: true, mode: "batch", ...result })
}

export const dynamic = "force-dynamic"
