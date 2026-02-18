import { type NextRequest } from "next/server"
import { queryOne } from "@/lib/db"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

export type SecurityAuditEvent =
  | "auth.login.attempt"
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.forbidden.access"
  | "auth.session.created"
  | "auth.session.refresh"
  | "auth.session.revoked"
  | "auth.session.invalidated"
  | "admin.role.changed"
  | "admin.permission.granted"
  | "admin.permission.revoked"
  | "admin.action.executed"

const SENSITIVE_KEY_PATTERN = /(token|secret|password|credential|authorization|cookie|email|card|cvv|otp|session|refresh|access|payload|payment|auth)/i

function sanitizeAuditDetails(details: Record<string, unknown> = {}) {
  const sanitized = sanitizePaymentActivityDetails(details)
  const mappedEntries = Object.entries(sanitized).map(([key, value]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return [key, "[REDACTED]"]
    }

    if (typeof value === "string" && SENSITIVE_KEY_PATTERN.test(value)) {
      return [key, "[REDACTED]"]
    }

    return [key, value]
  })

  return Object.fromEntries(mappedEntries)
}

export async function recordSecurityAuditEvent(entry: {
  event: SecurityAuditEvent
  actorUserId?: number | string | null
  resource: string
  request?: NextRequest
  details?: Record<string, unknown>
}) {
  const ipAddress = entry.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const userAgent = entry.request?.headers.get("user-agent") ?? "unknown"

  try {
    await queryOne(
      `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [entry.actorUserId ? String(entry.actorUserId) : null, entry.event, entry.resource, sanitizeAuditDetails(entry.details), ipAddress, userAgent],
    )
  } catch {
    // Non-blocking by design.
  }
}
