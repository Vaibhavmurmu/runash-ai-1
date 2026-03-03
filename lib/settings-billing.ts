import { Database } from "@/lib/database"
import { getUsageSummary } from "@/lib/billing-usage"
import { parseBio } from "@/lib/settings-security"
import type { SettingsData } from "@/components/settings/types"

const DEFAULT_BILLING: SettingsData["billing"] = {
  invoiceEmail: "",
  autoRechargeEnabled: false,
  planName: "Starter",
  subscriptionStatus: "trial",
  billingMethodSummary: "No default payment method on file.",
  usageThisCycle: 0,
  usageLimit: 1000,
  creditsBalance: 0,
  referralCode: "",
}

function mapSubscriptionStatus(status: unknown): SettingsData["billing"]["subscriptionStatus"] {
  if (status === "active") return "active"
  if (status === "trialing" || status === "trial") return "trial"
  if (status === "past_due") return "past_due"
  if (status === "incomplete" || status === "unpaid" || status === "canceled") return "at_risk"
  return DEFAULT_BILLING.subscriptionStatus
}

async function loadUserBillingSettings(userId: number) {
  const userRows = await Database.query<{
    email: string | null
    bio: unknown
  }>(`SELECT email, bio FROM users WHERE id = $1 LIMIT 1`, [userId])

  const row = userRows[0]
  const parsedBio = parseBio(row?.bio)
  const userSettings = parsedBio.userSettings && typeof parsedBio.userSettings === "object"
    ? (parsedBio.userSettings as Record<string, unknown>)
    : {}
  const billing = userSettings.billing && typeof userSettings.billing === "object"
    ? (userSettings.billing as Partial<SettingsData["billing"]>)
    : {}

  return {
    invoiceEmail: typeof billing.invoiceEmail === "string" && billing.invoiceEmail.length > 0
      ? billing.invoiceEmail
      : row?.email ?? DEFAULT_BILLING.invoiceEmail,
    autoRechargeEnabled: typeof billing.autoRechargeEnabled === "boolean" ? billing.autoRechargeEnabled : DEFAULT_BILLING.autoRechargeEnabled,
    billingMethodSummary: typeof billing.billingMethodSummary === "string" && billing.billingMethodSummary.length > 0
      ? billing.billingMethodSummary
      : DEFAULT_BILLING.billingMethodSummary,
    referralCode: typeof billing.referralCode === "string" ? billing.referralCode : "",
  }
}

export async function getBillingSummaryPayload(userId: number) {
  const settingsBilling = await loadUserBillingSettings(userId)

  const subscriptionRows = await Database.query<{
    status: string | null
    plan_name: string | null
  }>(
    `
      SELECT us.status, sp.name AS plan_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC
      LIMIT 1
    `,
    [String(userId)],
  )

  const subscription = subscriptionRows[0]
  const usage = await getUsageSummary(String(userId), "starter")

  const usageCredits = Math.max((usage.limits.credits ?? DEFAULT_BILLING.usageLimit) - (usage.totals.credits ?? 0), 0)

  return {
    planName: subscription?.plan_name ?? DEFAULT_BILLING.planName,
    subscriptionStatus: mapSubscriptionStatus(subscription?.status),
    creditsBalance: usageCredits,
    billingMethodSummary: settingsBilling.billingMethodSummary,
    invoiceEmail: settingsBilling.invoiceEmail,
    autoRechargeEnabled: settingsBilling.autoRechargeEnabled,
  }
}

export async function getBillingInvoicesPayload(userId: number, limit = 10, offset = 0) {
  const clampedLimit = Math.max(1, Math.min(limit, 50))
  const clampedOffset = Math.max(0, offset)
  const invoices = await Database.query(
    `
      SELECT i.id, i.status, i.currency, i.total, i.amount_due, i.amount_paid, i.due_date, i.created_at
      FROM invoices i
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [String(userId), clampedLimit, clampedOffset],
  )

  const [{ total }] = await Database.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM invoices WHERE user_id = $1`, [String(userId)])

  return {
    invoices,
    total: Number.parseInt(total || "0", 10),
    limit: clampedLimit,
    offset: clampedOffset,
  }
}

export async function getBillingUsagePayload(userId: number) {
  const usage = await getUsageSummary(String(userId), "starter")
  const usageThisCycle = usage.totals.credits ?? 0
  const usageLimit = usage.limits.credits ?? DEFAULT_BILLING.usageLimit

  return {
    usageThisCycle,
    usageLimit,
    period: usage.period,
  }
}

export async function getBillingReferralsPayload(userId: number) {
  const settingsBilling = await loadUserBillingSettings(userId)
  const referralCode = settingsBilling.referralCode || `RUNASH-${userId.toString().padStart(4, "0")}`
  return {
    referralCode,
    referralCount: 0,
    referralCreditsEarned: 0,
  }
}
