import { type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

export interface StructuredDispatchStatusMetrics {
  sent: number
  delivered: number
  deferred: number
  bounced: number
  complained: number
  suppressed: number
}

export function mapEventToStructuredMetric(type: NormalizedEmailWebhookEvent["type"]): keyof StructuredDispatchStatusMetrics | null {
  if (type === "delivered") return "delivered"
  if (type === "deferred") return "deferred"
  if (type === "bounced") return "bounced"
  if (type === "complaint") return "complained"
  if (type === "suppressed") return "suppressed"
  return null
}
