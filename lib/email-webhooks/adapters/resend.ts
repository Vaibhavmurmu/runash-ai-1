import { type ProviderNormalizationResult, type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

function mapResendType(eventType?: string): NormalizedEmailWebhookEvent["type"] | null {
  switch ((eventType || "").toLowerCase()) {
    case "email.delivered":
    case "delivered":
      return "delivered"
    case "email.opened":
    case "opened":
      return "opened"
    case "email.clicked":
    case "clicked":
      return "clicked"
    case "email.bounced":
    case "bounced":
      return "bounced"
    case "email.complained":
    case "complained":
    case "complaint":
      return "complaint"
    case "email.unsubscribed":
    case "unsubscribed":
      return "unsubscribed"
    default:
      return null
  }
}

export function normalizeResendWebhook(payload: Record<string, any>): ProviderNormalizationResult {
  const events = Array.isArray(payload) ? payload : [payload]
  const normalized: NormalizedEmailWebhookEvent[] = []
  let ignoredCount = 0

  for (const event of events) {
    const type = mapResendType(event?.type)
    if (!type || !event?.data?.email) {
      ignoredCount++
      continue
    }

    const messageId = (event.data?.email_id || event.data?.message_id || event.data?.messageId || "").toString()
    if (!messageId) {
      ignoredCount++
      continue
    }

    normalized.push({
      provider: "resend",
      providerEventId: (event.id || `${messageId}:${type}:${event.created_at || Date.now()}`).toString(),
      type,
      messageId,
      recipientEmail: event.data.email.toString().toLowerCase(),
      timestamp: new Date(event.created_at || event.data.created_at || Date.now()),
      reason: event.data?.reason,
      metadata: {
        campaign_id: event.data?.campaign_id,
        click_url: event.data?.click_url,
      },
      raw: event,
    })
  }

  return { events: normalized, ignoredCount }
}
