import { Database } from "@/lib/database"

export type EventSource = "web" | "api" | "agent_action"

export interface LifecycleSnapshot {
  signupToCheckoutConversion: number
  failedPaymentRecoveryRate: number
  recoveryRate: number
  churnRate: number
  mrr: number
  arpu: number
  ltv: number | null
  planBreakdown: Array<{
    planId: string
    planName: string
    active: number
    churned: number
    retentionRate: number
    churnRate: number
  }>
  cohortView: Array<{
    cohortMonth: string
    signups: number
    converted: number
    conversionRate: number
  }>
}

async function tableExists(name: string): Promise<boolean> {
  const [row] = await Database.query<{ exists: boolean }>("SELECT to_regclass($1) IS NOT NULL AS exists", [name])
  return Boolean(row?.exists)
}

function toNumber(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0
  if (typeof input === "string") {
    const parsed = Number(input)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export async function getLifecycleSnapshot(): Promise<LifecycleSnapshot> {
  const hasProfiles = await tableExists("customer_profiles")
  const hasRecovery = await tableExists("payment_recovery_events")

  const [conversionRow] = hasProfiles
    ? await Database.query<{ signups: number; checkouts: number }>(`
        SELECT
          COUNT(*)::int AS signups,
          COUNT(*) FILTER (WHERE first_checkout_at IS NOT NULL)::int AS checkouts
        FROM customer_profiles
      `)
    : [{ signups: 0, checkouts: 0 }]

  const [recoveryRow] = hasRecovery
    ? await Database.query<{ recovered_count: number; failed_count: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE outcome = 'recovered')::int AS recovered_count,
          COUNT(*) FILTER (WHERE outcome = 'failed')::int AS failed_count
        FROM payment_recovery_events
      `)
    : [{ recovered_count: 0, failed_count: 0 }]

  const planRows = await Database.query<{
    plan_id: string | null
    plan_name: string | null
    active_count: number
    churned_count: number
  }>(`
    SELECT
      us.plan_id,
      COALESCE(sp.name, us.plan_id, 'unknown') AS plan_name,
      COUNT(*) FILTER (WHERE us.status IN ('active', 'trialing', 'past_due'))::int AS active_count,
      COUNT(*) FILTER (WHERE us.status = 'canceled' OR us.ended_at IS NOT NULL)::int AS churned_count
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    GROUP BY us.plan_id, sp.name
    ORDER BY active_count DESC
  `)

  const cohortRows = hasProfiles
    ? await Database.query<{
        cohort_month: string
        signups: number
        converted: number
      }>(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS cohort_month,
          COUNT(*)::int AS signups,
          COUNT(*) FILTER (WHERE first_checkout_at IS NOT NULL)::int AS converted
        FROM customer_profiles
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 12
      `)
    : []

  const [mrrRow] = await Database.query<{ mrr: number; active_subscriptions: number }>(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN sp.interval = 'year' THEN sp.price / 12.0
            ELSE sp.price
          END
        ),
        0
      )::numeric AS mrr,
      COUNT(*)::int AS active_subscriptions
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status IN ('active', 'trialing', 'past_due')
  `)

  const [churnRow] = await Database.query<{ churned_30d: number; base_count: number }>(`
    WITH active_base AS (
      SELECT COUNT(*)::int AS count
      FROM user_subscriptions
      WHERE status IN ('active', 'trialing', 'past_due')
         OR (status = 'canceled' AND canceled_at >= NOW() - INTERVAL '30 day')
    )
    SELECT
      COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at >= NOW() - INTERVAL '30 day')::int AS churned_30d,
      (SELECT count FROM active_base)::int AS base_count
    FROM user_subscriptions
  `)

  const signups = toNumber(conversionRow?.signups)
  const checkouts = toNumber(conversionRow?.checkouts)
  const recoveredCount = toNumber(recoveryRow?.recovered_count)
  const failedCount = toNumber(recoveryRow?.failed_count)

  const signupToCheckoutConversion = signups > 0 ? (checkouts / signups) * 100 : 0
  const recoveryRate = recoveredCount + failedCount > 0 ? (recoveredCount / (recoveredCount + failedCount)) * 100 : 0
  const failedPaymentRecoveryRate = recoveredCount + failedCount > 0 ? (failedCount / (recoveredCount + failedCount)) * 100 : 0

  const mrr = toNumber(mrrRow?.mrr) / 100
  const activeSubscriptions = toNumber(mrrRow?.active_subscriptions)
  const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0

  const baseCount = toNumber(churnRow?.base_count)
  const churnRate = baseCount > 0 ? (toNumber(churnRow?.churned_30d) / baseCount) * 100 : 0
  const ltv = churnRate > 0 ? arpu / (churnRate / 100) : null

  return {
    signupToCheckoutConversion,
    failedPaymentRecoveryRate,
    recoveryRate,
    churnRate,
    mrr,
    arpu,
    ltv,
    planBreakdown: planRows.map((row) => {
      const active = toNumber(row.active_count)
      const churned = toNumber(row.churned_count)
      const total = active + churned
      return {
        planId: row.plan_id ?? "unknown",
        planName: row.plan_name ?? row.plan_id ?? "unknown",
        active,
        churned,
        retentionRate: total > 0 ? (active / total) * 100 : 0,
        churnRate: total > 0 ? (churned / total) * 100 : 0,
      }
    }),
    cohortView: cohortRows.map((row) => {
      const rowSignups = toNumber(row.signups)
      const rowConverted = toNumber(row.converted)
      return {
        cohortMonth: row.cohort_month,
        signups: rowSignups,
        converted: rowConverted,
        conversionRate: rowSignups > 0 ? (rowConverted / rowSignups) * 100 : 0,
      }
    }),
  }
}

export async function createLifecycleEvent(input: {
  customerId: string
  eventType: string
  source: EventSource
  actorUserId?: string | null
  metadata?: Record<string, unknown>
}) {
  const hasEvents = await tableExists("customer_events")
  if (!hasEvents) {
    throw new Error("customer_events table not found. Run lifecycle migrations first.")
  }

  const [event] = await Database.query<{ id: string }>(
    `
    INSERT INTO customer_events (customer_id, event_type, source, actor_user_id, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING id
  `,
    [input.customerId, input.eventType, input.source, input.actorUserId ?? null, JSON.stringify(input.metadata ?? {})],
  )

  return event
}
