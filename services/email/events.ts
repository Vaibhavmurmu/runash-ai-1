import { createHash, randomUUID } from "crypto"

export const EMAIL_EVENT_TYPES = {
  USER_VERIFY_EMAIL: "USER_VERIFY_EMAIL",
  CONTACT_FORM_RECEIVED: "CONTACT_FORM_RECEIVED",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  GENERIC_EMAIL: "GENERIC_EMAIL",
} as const

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[keyof typeof EMAIL_EVENT_TYPES]

interface EmailEventBase<TType extends EmailEventType, TPayload extends Record<string, unknown>> {
  type: TType
  to: string | string[]
  payload: TPayload
  metadata?: {
    category?: string
    headers?: Record<string, string>
    tags?: string[]
  }
  idempotencyKey?: string
  source?: string
}

export type UserVerifyEmailEvent = EmailEventBase<
  "USER_VERIFY_EMAIL",
  {
    name: string
    verificationUrl: string
  }
>

export type ContactFormReceivedEvent = EmailEventBase<
  "CONTACT_FORM_RECEIVED",
  {
    contactName: string
    contactEmail: string
    message: string
    submittedAt: string
  }
>

export type SubscriptionRenewedEvent = EmailEventBase<
  "SUBSCRIPTION_RENEWED",
  {
    name: string
    planName: string
    renewedAt: string
    amount: string
  }
>

export type GenericEmailEvent = EmailEventBase<
  "GENERIC_EMAIL",
  {
    subject: string
    html: string
    text?: string
    from?: string
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
    track_delivery?: boolean
    template_id?: number
    campaign_id?: number
    user_id?: number
    recipient_name?: string
  }
>

export type EmailEvent = UserVerifyEmailEvent | ContactFormReceivedEvent | SubscriptionRenewedEvent | GenericEmailEvent

export function buildEmailEventIdempotencyKey(event: EmailEvent) {
  const keyBase = {
    type: event.type,
    to: event.to,
    payload: event.payload,
    category: event.metadata?.category,
  }

  return createHash("sha256").update(JSON.stringify(keyBase)).digest("hex")
}

export function resolveEmailEventId(event: EmailEvent) {
  return event.idempotencyKey?.trim() || buildEmailEventIdempotencyKey(event) || randomUUID()
}
