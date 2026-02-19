import { EmailBounceHandler } from "@/lib/email-bounce-handler"
import { EmailDeliveryTracker } from "@/lib/email-delivery"
import { triggerEmailEvent } from "@/lib/email-realtime"
import { recordWebhookEvent, wasEventProcessed } from "@/lib/email-webhooks/store"
import { type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

export interface IngestionSummary {
  received: number
  processed: number
  ignored: number
  duplicates: number
  failed: number
}

function mapDeliveryStatus(type: NormalizedEmailWebhookEvent["type"]) {
  if (type === "delivered") return "delivered"
  if (type === "bounced" || type === "complaint") return "bounced"
  return null
}

function mapEngagementType(type: NormalizedEmailWebhookEvent["type"]): "open" | "click" | "unsubscribe" | "complaint" | null {
  if (type === "opened") return "open"
  if (type === "clicked") return "click"
  if (type === "unsubscribed") return "unsubscribe"
  if (type === "complaint") return "complaint"
  return null
}

export async function ingestNormalizedEvents(events: NormalizedEmailWebhookEvent[]): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    received: events.length,
    processed: 0,
    ignored: 0,
    duplicates: 0,
    failed: 0,
  }

  for (const event of events) {
    const alreadyProcessed = await wasEventProcessed(event.provider, event.providerEventId)
    if (alreadyProcessed) {
      summary.duplicates++
      continue
    }

    try {
      const status = mapDeliveryStatus(event.type)
      if (status) {
        await EmailDeliveryTracker.updateDeliveryStatus(event.messageId, status, {
          bounce_reason: event.reason,
          tracking_data: {
            provider: event.provider,
            bounce_type: event.bounceType,
            metadata: event.metadata,
            webhook_event_id: event.providerEventId,
          },
        })
      }

      const engagement = mapEngagementType(event.type)
      if (engagement) {
        await EmailDeliveryTracker.trackEngagement(event.messageId, engagement, {
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          event_data: {
            provider: event.provider,
            reason: event.reason,
            metadata: event.metadata,
            webhook_event_id: event.providerEventId,
          },
        })
      }

      if (event.type === "bounced" || event.type === "complaint") {
        await EmailBounceHandler.processBounce({
          message_id: event.messageId,
          recipient_email: event.recipientEmail,
          bounce_type: event.bounceType || (event.type === "complaint" ? "complaint" : "hard"),
          reason: event.reason || (event.type === "complaint" ? "Spam complaint" : "Provider bounce"),
          timestamp: event.timestamp,
          raw_data: {
            provider: event.provider,
            metadata: event.metadata,
            raw: event.raw,
          },
        })
      }

      triggerEmailEvent({
        type: event.type,
        messageId: event.messageId,
        email: event.recipientEmail,
        timestamp: event.timestamp,
        data: {
          provider: event.provider,
          reason: event.reason,
          metadata: event.metadata,
        },
      })

      await recordWebhookEvent(event, "processed")
      summary.processed++
    } catch (error) {
      summary.failed++
      const message = error instanceof Error ? error.message.slice(0, 500) : "webhook_processing_failed"
      await recordWebhookEvent(event, "failed", message)
    }
  }

  return summary
}
