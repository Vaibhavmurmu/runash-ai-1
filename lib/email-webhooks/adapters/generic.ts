import { type ProviderNormalizationResult, type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

function mapGenericType(eventType?: string): NormalizedEmailWebhookEvent["type"] | null {
  switch ((eventType || "").toLowerCase()) {
    case "delivered":
      return "delivered"
    case "opened":
    case "open":
      return "opened"
    case "clicked":
    case "click":
      return "clicked"
    case "bounced":
    case "bounce":
      return "bounced"
    case "deferred":
      return "deferred"
    case "suppressed":
    case "dropped":
      return "suppressed"
    case "complaint":
    case "complained":
      return "complaint"
    case "unsubscribed":
    case "unsubscribe":
      return "unsubscribed"
    default:
      return null
  }
}

export function normalizeGenericWebhook(payload: Record<string, any>): ProviderNormalizationResult {
  const eventsInput = Array.isArray(payload?.events)
    ? payload.events
    : Array.isArray(payload)
      ? payload
      : [payload]
  const events: NormalizedEmailWebhookEvent[] = []
  let ignoredCount = 0

  for (const event of eventsInput) {
    const type = mapGenericType(event?.event || event?.type)
    const email = event?.email || event?.recipient_email
    const messageId = event?.message_id || event?.messageId

    if (!type || !email || !messageId) {
      ignoredCount++
      continue
    }

    events.push({
      provider: "generic",
      providerEventId: (event.event_id || `${messageId}:${type}:${event.timestamp || Date.now()}`).toString(),
      type,
      messageId: String(messageId),
      recipientEmail: String(email).toLowerCase(),
      timestamp: new Date(event.timestamp || Date.now()),
      bounceType: event.bounce_type,
      reason: event.reason,
      ipAddress: event.ip_address,
      userAgent: event.user_agent,
      metadata: event.metadata,
      raw: event,
    })
  }

  return { events, ignoredCount }
}
