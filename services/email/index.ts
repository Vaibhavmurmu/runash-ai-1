import { auditEmailEvent, redactRecipients } from "./audit"
import { resolveEmailProviderClient } from "./client"
import type { EmailEvent } from "./events"
import { renderEmailTemplate } from "./templates"
import { reserveEmailEvent } from "./queue"

export async function sendEmailEvent(event: EmailEvent) {
  const reservation = reserveEmailEvent(event)

  if (!reservation.accepted) {
    auditEmailEvent("email.event.duplicate", {
      type: event.type,
      idempotencyKey: reservation.idempotencyKey,
      recipients: redactRecipients(event.to),
      source: event.source,
    })

    return {
      success: true,
      duplicate: true,
      idempotencyKey: reservation.idempotencyKey,
    }
  }

  const rendered = renderEmailTemplate(event)
  const client = resolveEmailProviderClient()

  auditEmailEvent("email.event.send.attempt", {
    type: event.type,
    idempotencyKey: reservation.idempotencyKey,
    provider: client.name,
    recipients: redactRecipients(event.to),
    source: event.source,
  })

  const providerResponse = await client.send({
    to: event.to,
    from: rendered.from,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: event.metadata?.headers,
    attachments: event.type === "GENERIC_EMAIL" ? event.payload.attachments : undefined,
  })

  auditEmailEvent("email.event.send.success", {
    type: event.type,
    idempotencyKey: reservation.idempotencyKey,
    provider: client.name,
    recipients: redactRecipients(event.to),
  })

  return {
    success: true,
    provider: client.name,
    idempotencyKey: reservation.idempotencyKey,
    providerResponse,
  }
}
