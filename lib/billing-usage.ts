import { queryMany, queryOne } from "@/lib/db"
import { createHash } from "crypto"

function ym() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10)
}

export type UsageMetric = "stream_minutes" | "uploads_gb" | "view_minutes" | "credits"
export type Plan = "free" | "starter" | "pro" | "business"
export type UsageResolverType = "builtin" | "custom" | "external"

export type UsageSummary = {
  period: string
  userId: string
  totals: Record<UsageMetric, number>
  limits: Partial<Record<UsageMetric, number>>
  utilization: Partial<Record<UsageMetric, number>>
}

export type UsagePricingModel =
  | {
      strategy: "token"
      promptTokenRate: number
      completionTokenRate: number
      minimumCharge?: number
    }
  | {
      strategy: "execution_time"
      millisecondRate: number
      minimumCharge?: number
    }
  | {
      strategy: "hybrid"
      promptTokenRate: number
      completionTokenRate: number
      millisecondRate: number
      minimumCharge?: number
    }

export type UsageEventIngestionInput = {
  eventId: string
  customerId: string
  subscriptionId?: string | null
  userId?: string | null
  occurredAt?: string
  model?: string | null
  resolver?: string | null
  resolverId?: string | null
  resolverType?: UsageResolverType | null
  promptTokens: number
  completionTokens: number
  totalTokens?: number
  deltaMs: number
  metadata?: Record<string, unknown>
  pricingModel: UsagePricingModel
  delayed?: boolean
}

export type UsageChargeBreakdown = {
  promptTokenCharge: number
  completionTokenCharge: number
  executionTimeCharge: number
  totalCharge: number
}

export type CurrentPeriodUsageSummary = {
  customerId: string
  subscriptionId: string | null
  periodStart: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  deltaMs: number
  eventsCount: number
  chargeAmount: number
}

export type UsageCostPreview = {
  eventsCount: number
  totals: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    deltaMs: number
  }
  charge: UsageChargeBreakdown
}

let usageTableEnsured = false
let usageEventsTablesEnsured = false

async function ensureUsageTable() {
  if (usageTableEnsured) return

  await queryMany(`
    CREATE TABLE IF NOT EXISTS billing_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      period TEXT NOT NULL,
      metric TEXT NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, period, metric)
    );
  `)

  await queryMany(`CREATE INDEX IF NOT EXISTS idx_billing_usage_user_period ON billing_usage(user_id, period);`)
  usageTableEnsured = true
}

async function ensureUsageEventsTables() {
  if (usageEventsTablesEnsured) return

  await queryMany(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      subscription_id TEXT,
      user_id TEXT,
      occurred_at TIMESTAMPTZ NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      delta_ms INTEGER NOT NULL DEFAULT 0,
      model TEXT,
      resolver TEXT,
      resolver_id TEXT,
      resolver_type TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      payload_hash TEXT NOT NULL,
      delayed_ingestion BOOLEAN NOT NULL DEFAULT FALSE,
      charge_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await queryMany(`ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS payload_hash TEXT`)
  await queryMany(`UPDATE usage_events SET payload_hash = event_id WHERE payload_hash IS NULL`)
  await queryMany(`ALTER TABLE usage_events ALTER COLUMN payload_hash SET NOT NULL`)

  await queryMany(`
    CREATE TABLE IF NOT EXISTS usage_aggregates (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      subscription_id TEXT,
      aggregate_type TEXT NOT NULL,
      period_start DATE NOT NULL,
      prompt_tokens BIGINT NOT NULL DEFAULT 0,
      completion_tokens BIGINT NOT NULL DEFAULT 0,
      total_tokens BIGINT NOT NULL DEFAULT 0,
      delta_ms BIGINT NOT NULL DEFAULT 0,
      events_count BIGINT NOT NULL DEFAULT 0,
      charge_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, subscription_id, aggregate_type, period_start)
    );
  `)

  await queryMany(`
    CREATE TABLE IF NOT EXISTS usage_ingestion_queue (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await queryMany(`CREATE INDEX IF NOT EXISTS idx_usage_events_customer_created ON usage_events(customer_id, created_at DESC);`)
  await queryMany(`CREATE INDEX IF NOT EXISTS idx_usage_events_payload_hash ON usage_events(payload_hash);`)
  await queryMany(`CREATE INDEX IF NOT EXISTS idx_usage_aggregates_period ON usage_aggregates(customer_id, period_start, aggregate_type);`)
  await queryMany(`CREATE INDEX IF NOT EXISTS idx_usage_ingestion_queue_status ON usage_ingestion_queue(status, next_retry_at);`)

  usageEventsTablesEnsured = true
}

export function calculateUsageCharge(input: {
  promptTokens: number
  completionTokens: number
  totalTokens?: number
  deltaMs: number
  pricingModel: UsagePricingModel
}): UsageChargeBreakdown {
  const promptTokens = Math.max(0, input.promptTokens)
  const completionTokens = Math.max(0, input.completionTokens)
  const totalTokens = Math.max(0, input.totalTokens ?? promptTokens + completionTokens)
  const deltaMs = Math.max(0, input.deltaMs)

  const tokenPromptCharge =
    input.pricingModel.strategy === "execution_time" ? 0 : promptTokens * Math.max(0, input.pricingModel.promptTokenRate)
  const tokenCompletionCharge =
    input.pricingModel.strategy === "execution_time"
      ? 0
      : completionTokens * Math.max(0, input.pricingModel.completionTokenRate)
  const executionCharge =
    input.pricingModel.strategy === "token" ? 0 : deltaMs * Math.max(0, input.pricingModel.millisecondRate)

  const baseTotal = tokenPromptCharge + tokenCompletionCharge + executionCharge
  const minimum = Math.max(0, input.pricingModel.minimumCharge ?? 0)

  return {
    promptTokenCharge: tokenPromptCharge,
    completionTokenCharge: tokenCompletionCharge,
    executionTimeCharge: executionCharge,
    totalCharge: Math.max(baseTotal, minimum),
  }
}

async function updateUsageAggregates(input: {
  customerId: string
  subscriptionId?: string | null
  occurredAt: Date
  promptTokens: number
  completionTokens: number
  totalTokens: number
  deltaMs: number
  chargeAmount: number
}) {
  const dailyPeriodStart = ymd(input.occurredAt)
  const monthlyPeriodStart = `${input.occurredAt.getUTCFullYear()}-${String(input.occurredAt.getUTCMonth() + 1).padStart(2, "0")}-01`

  const upsertAggregate = async (aggregateType: "daily" | "monthly", periodStart: string) => {
    await queryMany(
      `
      INSERT INTO usage_aggregates (
        id,
        customer_id,
        subscription_id,
        aggregate_type,
        period_start,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        delta_ms,
        events_count,
        charge_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)
      ON CONFLICT (customer_id, subscription_id, aggregate_type, period_start)
      DO UPDATE SET
        prompt_tokens = usage_aggregates.prompt_tokens + EXCLUDED.prompt_tokens,
        completion_tokens = usage_aggregates.completion_tokens + EXCLUDED.completion_tokens,
        total_tokens = usage_aggregates.total_tokens + EXCLUDED.total_tokens,
        delta_ms = usage_aggregates.delta_ms + EXCLUDED.delta_ms,
        events_count = usage_aggregates.events_count + 1,
        charge_amount = usage_aggregates.charge_amount + EXCLUDED.charge_amount,
        updated_at = NOW()
    `,
      [
        crypto.randomUUID(),
        input.customerId,
        input.subscriptionId ?? null,
        aggregateType,
        periodStart,
        Math.max(0, input.promptTokens),
        Math.max(0, input.completionTokens),
        Math.max(0, input.totalTokens),
        Math.max(0, input.deltaMs),
        input.chargeAmount,
      ],
    )
  }

  await upsertAggregate("daily", dailyPeriodStart)
  await upsertAggregate("monthly", monthlyPeriodStart)
}

export async function ingestUsageEvent(input: UsageEventIngestionInput) {
  await ensureUsageEventsTables()

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
  const totalTokens = input.totalTokens ?? input.promptTokens + input.completionTokens
  const charge = calculateUsageCharge({
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens,
    deltaMs: input.deltaMs,
    pricingModel: input.pricingModel,
  })

  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        customerId: input.customerId,
        subscriptionId: input.subscriptionId ?? null,
        userId: input.userId ?? null,
        occurredAt: occurredAt.toISOString(),
        promptTokens: Math.max(0, input.promptTokens),
        completionTokens: Math.max(0, input.completionTokens),
        totalTokens: Math.max(0, totalTokens),
        deltaMs: Math.max(0, input.deltaMs),
        model: input.model ?? null,
        resolver: input.resolver ?? null,
        resolverId: input.resolverId ?? null,
        resolverType: input.resolverType ?? null,
      }),
    )
    .digest("hex")

  const inserted = await queryOne<{ id: string }>(
    `
    INSERT INTO usage_events (
      id,
      event_id,
      customer_id,
      subscription_id,
      user_id,
      occurred_at,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      delta_ms,
      model,
      resolver,
      resolver_id,
      resolver_type,
      metadata,
      payload_hash,
      delayed_ingestion,
      charge_amount
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17, $18
    )
    ON CONFLICT (event_id)
    DO NOTHING
    RETURNING id
  `,
    [
      crypto.randomUUID(),
      input.eventId,
      input.customerId,
      input.subscriptionId ?? null,
      input.userId ?? null,
      occurredAt.toISOString(),
      Math.max(0, input.promptTokens),
      Math.max(0, input.completionTokens),
      Math.max(0, totalTokens),
      Math.max(0, input.deltaMs),
      input.model ?? null,
      input.resolver ?? null,
      input.resolverId ?? null,
      input.resolverType ?? null,
      JSON.stringify(input.metadata ?? {}),
      payloadHash,
      Boolean(input.delayed),
      charge.totalCharge,
    ],
  )

  if (!inserted) {
    const existing = await queryOne<{ payload_hash: string }>(`SELECT payload_hash FROM usage_events WHERE event_id = $1`, [input.eventId])
    return {
      ingested: false,
      duplicate: true,
      duplicateMismatch: existing ? existing.payload_hash !== payloadHash : false,
      charge,
    }
  }

  await updateUsageAggregates({
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
    occurredAt,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens,
    deltaMs: input.deltaMs,
    chargeAmount: charge.totalCharge,
  })

  return { ingested: true, duplicate: false, duplicateMismatch: false, charge }
}

export async function ingestUsageEventsBatch(events: UsageEventIngestionInput[]) {
  const results = [] as Array<{
    eventId: string
    ingested: boolean
    duplicate: boolean
    duplicateMismatch: boolean
    charge: UsageChargeBreakdown
  }>

  for (const event of events) {
    const result = await ingestUsageEvent(event)
    results.push({ eventId: event.eventId, ...result })
  }

  return {
    total: events.length,
    ingested: results.filter((item) => item.ingested).length,
    duplicates: results.filter((item) => item.duplicate).length,
    duplicateMismatches: results.filter((item) => item.duplicateMismatch).length,
    results,
  }
}

export async function getCurrentPeriodUsage(customerId: string, subscriptionId?: string | null): Promise<CurrentPeriodUsageSummary> {
  await ensureUsageEventsTables()
  const now = new Date()
  const periodStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`

  const row = await queryOne<{
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    delta_ms: number
    events_count: number
    charge_amount: number
  }>(
    `
    SELECT
      COALESCE(prompt_tokens, 0)::float8 as prompt_tokens,
      COALESCE(completion_tokens, 0)::float8 as completion_tokens,
      COALESCE(total_tokens, 0)::float8 as total_tokens,
      COALESCE(delta_ms, 0)::float8 as delta_ms,
      COALESCE(events_count, 0)::float8 as events_count,
      COALESCE(charge_amount, 0)::float8 as charge_amount
    FROM usage_aggregates
    WHERE customer_id = $1
      AND aggregate_type = 'monthly'
      AND period_start = $2::date
      AND (($3::text IS NULL AND subscription_id IS NULL) OR subscription_id = $3::text)
    LIMIT 1
  `,
    [customerId, periodStart, subscriptionId ?? null],
  )

  return {
    customerId,
    subscriptionId: subscriptionId ?? null,
    periodStart,
    promptTokens: Number(row?.prompt_tokens ?? 0),
    completionTokens: Number(row?.completion_tokens ?? 0),
    totalTokens: Number(row?.total_tokens ?? 0),
    deltaMs: Number(row?.delta_ms ?? 0),
    eventsCount: Number(row?.events_count ?? 0),
    chargeAmount: Number(row?.charge_amount ?? 0),
  }
}

export function previewUsageCosts(events: Array<Pick<UsageEventIngestionInput, "promptTokens" | "completionTokens" | "totalTokens" | "deltaMs" | "pricingModel">>): UsageCostPreview {
  const totals = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    deltaMs: 0,
  }

  const charge: UsageChargeBreakdown = {
    promptTokenCharge: 0,
    completionTokenCharge: 0,
    executionTimeCharge: 0,
    totalCharge: 0,
  }

  for (const event of events) {
    const eventTotalTokens = event.totalTokens ?? event.promptTokens + event.completionTokens
    const eventCharge = calculateUsageCharge({
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
      totalTokens: eventTotalTokens,
      deltaMs: event.deltaMs,
      pricingModel: event.pricingModel,
    })

    totals.promptTokens += Math.max(0, event.promptTokens)
    totals.completionTokens += Math.max(0, event.completionTokens)
    totals.totalTokens += Math.max(0, eventTotalTokens)
    totals.deltaMs += Math.max(0, event.deltaMs)

    charge.promptTokenCharge += eventCharge.promptTokenCharge
    charge.completionTokenCharge += eventCharge.completionTokenCharge
    charge.executionTimeCharge += eventCharge.executionTimeCharge
    charge.totalCharge += eventCharge.totalCharge
  }

  return {
    eventsCount: events.length,
    totals,
    charge,
  }
}

export async function enqueueDelayedUsageIngestion(event: UsageEventIngestionInput) {
  await ensureUsageEventsTables()

  await queryMany(
    `
    INSERT INTO usage_ingestion_queue (id, event_id, payload, status)
    VALUES ($1, $2, $3::jsonb, 'pending')
    ON CONFLICT (event_id)
    DO NOTHING
  `,
    [crypto.randomUUID(), event.eventId, JSON.stringify(event)],
  )
}

export async function reconcileDelayedUsageIngestion(limit = 50) {
  await ensureUsageEventsTables()

  const rows = await queryMany<{ event_id: string; payload: UsageEventIngestionInput; attempts: number }>(
    `
    SELECT event_id, payload, attempts
    FROM usage_ingestion_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT $1
  `,
    [Math.max(1, limit)],
  )

  let processed = 0
  let failed = 0

  for (const row of rows) {
    try {
      await ingestUsageEvent({ ...row.payload, delayed: true })
      processed += 1
      await queryMany(`DELETE FROM usage_ingestion_queue WHERE event_id = $1`, [row.event_id])
    } catch (error) {
      failed += 1
      const attempts = row.attempts + 1
      const retryMinutes = Math.min(60, attempts * 5)
      const message = error instanceof Error ? error.message.slice(0, 500) : "unknown_error"

      await queryMany(
        `
        UPDATE usage_ingestion_queue
        SET status = 'pending',
            attempts = attempts + 1,
            last_error = $2,
            next_retry_at = NOW() + ($3 || ' minutes')::interval,
            updated_at = NOW()
        WHERE event_id = $1
      `,
        [row.event_id, message, String(retryMinutes)],
      )
    }
  }

  return { processed, failed, scanned: rows.length }
}

export function defaultPlanLimits(plan: Plan): Partial<Record<UsageMetric, number>> {
  switch (plan) {
    case "free":
      return { stream_minutes: 300, uploads_gb: 5, view_minutes: 500, credits: 100 }
    case "starter":
      return { stream_minutes: 2000, uploads_gb: 50, view_minutes: 5000, credits: 1000 }
    case "pro":
      return { stream_minutes: 10000, uploads_gb: 200, view_minutes: 25000, credits: 5000 }
    case "business":
      return { stream_minutes: 50000, uploads_gb: 1000, view_minutes: 100000, credits: 20000 }
    default:
      return {}
  }
}

export async function incrementUsage(params: {
  userId: string
  metric: UsageMetric
  amount: number
  period?: string
}) {
  const { userId, metric, amount, period = ym() } = params
  await ensureUsageTable()

  await queryMany(
    `
    INSERT INTO billing_usage (id, user_id, period, metric, amount)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, period, metric)
    DO UPDATE SET amount = billing_usage.amount + EXCLUDED.amount, updated_at = NOW()
  `,
    [crypto.randomUUID(), userId, period, metric, amount],
  )

  return true
}

export async function getUsageSummary(userId: string, plan: Plan = "free", period = ym()): Promise<UsageSummary> {
  await ensureUsageTable()

  const rows = await queryMany<{ metric: UsageMetric; amount: number }>(
    `SELECT metric, amount::float8 as amount FROM billing_usage WHERE user_id = $1 AND period = $2`,
    [userId, period],
  )

  const totals: Record<UsageMetric, number> = {
    stream_minutes: 0,
    uploads_gb: 0,
    view_minutes: 0,
    credits: 0,
  }

  for (const row of rows) {
    if (row.metric in totals) totals[row.metric] = Number(row.amount ?? 0)
  }

  const limits = defaultPlanLimits(plan)
  const utilization: Partial<Record<UsageMetric, number>> = {}
  for (const metric of Object.keys(totals) as UsageMetric[]) {
    const limit = limits[metric]
    if (typeof limit === "number" && limit > 0) {
      utilization[metric] = Math.min(1, totals[metric] / limit)
    }
  }

  return { period, userId, totals, limits, utilization }
}

export function isNearLimit(summary: UsageSummary, metric: UsageMetric, threshold = 0.8) {
  const utilization = summary.utilization[metric]
  return typeof utilization === "number" && utilization >= threshold
}
