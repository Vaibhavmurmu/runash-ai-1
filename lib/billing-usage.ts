import { queryMany } from "@/lib/db"

function ym() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export type UsageMetric = "stream_minutes" | "uploads_gb" | "view_minutes" | "credits"
export type Plan = "free" | "starter" | "pro" | "business"

export type UsageSummary = {
  period: string
  userId: string
  totals: Record<UsageMetric, number>
  limits: Partial<Record<UsageMetric, number>>
  utilization: Partial<Record<UsageMetric, number>>
}

let usageTableEnsured = false

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
