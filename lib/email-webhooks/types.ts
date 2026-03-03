export type EmailWebhookProvider = "resend" | "sendgrid" | "ses" | "generic"

export type NormalizedEmailWebhookEventType =
  | "delivered"
  | "deferred"
  | "suppressed"
  | "opened"
  | "clicked"
  | "bounced"
  | "complaint"
  | "unsubscribed"

export interface NormalizedEmailWebhookEvent {
  provider: EmailWebhookProvider
  providerEventId: string
  type: NormalizedEmailWebhookEventType
  messageId: string
  recipientEmail: string
  timestamp: Date
  bounceType?: "hard" | "soft" | "complaint"
  reason?: string
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
  raw: Record<string, unknown>
}

export interface ProviderNormalizationResult {
  events: NormalizedEmailWebhookEvent[]
  ignoredCount: number
}
