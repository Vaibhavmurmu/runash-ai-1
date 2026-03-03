import { randomUUID } from "crypto"
import { logApiEvent } from "@/lib/api/logging"

function redactEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!domain) return "[REDACTED]"
  const visible = local.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`
}

export function redactRecipients(to: string | string[]) {
  const recipients = Array.isArray(to) ? to : [to]
  return recipients.map((recipient) => redactEmail(recipient.trim()))
}

export function auditEmailEvent(event: string, details: Record<string, unknown>, level: "info" | "warn" | "error" = "info") {
  logApiEvent(level, event, {
    requestId: randomUUID(),
    route: "internal/email-event",
    method: "INTERNAL",
    details,
  })
}
