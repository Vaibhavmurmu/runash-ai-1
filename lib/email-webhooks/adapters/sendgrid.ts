import { type ProviderNormalizationResult, type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

function mapSendgridType(eventType?: string): NormalizedEmailWebhookEvent["type"] | null {
  switch ((eventType || "").toLowerCase()) {
    case "delivered":
      return "delivered"
    case "open":
      return "opened"
    case "click":
      return "clicked"
    case "bounce":
    case "dropped":
    case "deferred":
      return "bounced"
    case "spamreport":
      return "complaint"
    case "unsubscribe":
    case "group_unsubscribe":
      return "unsubscribed"
    default:
      return null
  }
}

function resolveBounceType(event: Record<string, any>): "hard" | "soft" | "complaint" | undefined {
  if (event.event === "spamreport") return "complaint"
  if (event.event === "deferred" || event.type === "blocked") return "soft"
  return event.event === "bounce" || event.event === "dropped" ? "hard" : undefined
}

export function normalizeSendgridWebhook(payload: Record<string, any> | Array<Record<string, any>>): ProviderNormalizationResult {
  const events = Array.isArray(payload) ? payload : [payload]
  const normalized: NormalizedEmailWebhookEvent[] = []
  let ignoredCount = 0

  for (const event of events) {
    const type = mapSendgridType(event?.event)
    if (!type || !event?.email) {
      ignoredCount++
      continue
    }

    const messageId = (event.sg_message_id || event.smtp_id || event.message_id || "").toString().split(".")[0]
    if (!messageId) {
      ignoredCount++
      continue
    }

    const eventTimestamp = event.timestamp ? Number(event.timestamp) * 1000 : Date.now()

    normalized.push({
      provider: "sendgrid",
      providerEventId: (event.sg_event_id || `${messageId}:${type}:${eventTimestamp}`).toString(),
      type,
      messageId,
      recipientEmail: event.email.toString().toLowerCase(),
      timestamp: new Date(eventTimestamp),
      bounceType: resolveBounceType(event),
      reason: event.reason || event.response || (type === "complaint" ? "Spam complaint" : undefined),
      ipAddress: event.ip,
      userAgent: event.useragent,
      metadata: {
        category: event.category,
        asm_group_id: event.asm_group_id,
        url: event.url,
      },
      raw: event,
    })
  }

  return { events: normalized, ignoredCount }
}
