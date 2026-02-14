import { type NextRequest } from "next/server"
import { Database } from "@/lib/database"

interface PrivilegedAuditInput {
  actorUserId: string
  action: string
  resource: string
  request?: NextRequest
  details?: Record<string, unknown>
}

function sanitizeDetails(details: Record<string, unknown> = {}) {
  const blockedKeys = new Set(["token", "access_token", "refresh_token", "password", "secret", "client_secret", "card"])
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    sanitized[key] = blockedKeys.has(key.toLowerCase()) ? "[REDACTED]" : value
  }

  return sanitized
}

export async function logPrivilegedAction({ actorUserId, action, resource, request, details }: PrivilegedAuditInput) {
  const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const userAgent = request?.headers.get("user-agent") ?? "unknown"

  try {
    await Database.query(
      `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [actorUserId, action, resource, JSON.stringify(sanitizeDetails(details)), ipAddress, userAgent],
    )
  } catch {
    // Avoid throwing from audit paths; business action already completed.
  }
}
