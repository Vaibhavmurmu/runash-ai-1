import { z } from "zod"
import { logApiEvent } from "@/lib/api/logging"

export const linkSessionRequestSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    email: z.string().trim().email(),
    amountMinor: z.coerce.number().finite().positive().optional(),
    amount: z.coerce.number().finite().positive().optional(),
    currency: z.enum(["USD", "INR"]).optional(),
    human_confirmed: z.boolean().optional(),
    mfa_verified: z.boolean().optional(),
    userCountry: z.string().trim().min(2).max(3).optional(),
    riskScore: z.coerce.number().finite().optional(),
    riskSignals: z.array(z.string()).optional(),
  })
  .strict()

export const linkVerifyRequestSchema = z
  .object({
    sessionId: z.string().trim().min(1),
  })
  .strict()

export const linkSaveRequestSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    email: z.string().trim().email(),
    holderName: z.string().trim().min(1),
    cardNumber: z.string().trim().min(12).max(25),
    expMonth: z.coerce.number().int().min(1).max(12),
    expYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 30),
    billingAddress: z.string().trim().min(3).max(300).optional(),
    brand: z.string().trim().min(1).max(32).optional(),
  })
  .strict()

const funnelCounters = {
  sessionCreated: 0,
  sessionVerified: 0,
  autofillSuccess: 0,
  checkoutCompletion: 0,
  fallbackUsage: 0,
} as const

const mutableCounters: Record<keyof typeof funnelCounters, number> = { ...funnelCounters }

export type LinkFunnelMetric =
  | "session_created"
  | "session_verified"
  | "autofill_success"
  | "checkout_completion"
  | "fallback_usage"

const metricKeyByType: Record<LinkFunnelMetric, keyof typeof mutableCounters> = {
  session_created: "sessionCreated",
  session_verified: "sessionVerified",
  autofill_success: "autofillSuccess",
  checkout_completion: "checkoutCompletion",
  fallback_usage: "fallbackUsage",
}

export function trackLinkFunnelMetric(metric: LinkFunnelMetric, context: { requestId: string; correlationId?: string; [key: string]: unknown }) {
  const key = metricKeyByType[metric]
  mutableCounters[key] += 1
  logApiEvent("info", `payments.link_funnel.${metric}`, {
    route: "payments/link",
    requestId: context.requestId,
    details: {
      metric,
      correlationId: context.correlationId ?? context.requestId,
      counters: mutableCounters,
      ...context,
    },
  })
}

export function getLinkFunnelSnapshot() {
  return { ...mutableCounters }
}

