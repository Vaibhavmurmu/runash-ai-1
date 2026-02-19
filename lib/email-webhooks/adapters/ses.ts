import { type ProviderNormalizationResult, type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

export function normalizeSesWebhook(payload: Record<string, any>): ProviderNormalizationResult {
  const events: NormalizedEmailWebhookEvent[] = []

  if (payload.Type !== "Notification" || !payload.Message) {
    return { events, ignoredCount: 1 }
  }

  let parsed: Record<string, any>
  try {
    parsed = typeof payload.Message === "string" ? JSON.parse(payload.Message) : payload.Message
  } catch {
    return { events, ignoredCount: 1 }
  }

  const notificationType = parsed.notificationType
  const messageId = (parsed.mail?.messageId || "").toString()
  const timestamp = new Date(parsed.mail?.timestamp || Date.now())

  if (!messageId) {
    return { events, ignoredCount: 1 }
  }

  if (notificationType === "Delivery") {
    for (const recipient of parsed.delivery?.recipients || []) {
      events.push({
        provider: "ses",
        providerEventId: `${messageId}:delivered:${recipient}`,
        type: "delivered",
        messageId,
        recipientEmail: String(recipient).toLowerCase(),
        timestamp,
        raw: parsed,
      })
    }
  }

  if (notificationType === "Bounce") {
    const bounce = parsed.bounce || {}
    for (const recipient of bounce.bouncedRecipients || []) {
      events.push({
        provider: "ses",
        providerEventId: `${messageId}:bounced:${recipient.emailAddress}`,
        type: "bounced",
        messageId,
        recipientEmail: String(recipient.emailAddress).toLowerCase(),
        timestamp: new Date(bounce.timestamp || timestamp),
        bounceType: bounce.bounceType === "Permanent" ? "hard" : "soft",
        reason: recipient.diagnosticCode || bounce.bounceSubType || "SES bounce",
        metadata: {
          bounce_subtype: bounce.bounceSubType,
        },
        raw: parsed,
      })
    }
  }

  if (notificationType === "Complaint") {
    const complaint = parsed.complaint || {}
    for (const recipient of complaint.complainedRecipients || []) {
      events.push({
        provider: "ses",
        providerEventId: `${messageId}:complaint:${recipient.emailAddress}`,
        type: "complaint",
        messageId,
        recipientEmail: String(recipient.emailAddress).toLowerCase(),
        timestamp: new Date(complaint.timestamp || timestamp),
        bounceType: "complaint",
        reason: "Spam complaint",
        raw: parsed,
      })
    }
  }

  return { events, ignoredCount: events.length === 0 ? 1 : 0 }
}
