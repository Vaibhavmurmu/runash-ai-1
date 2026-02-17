import { NextResponse, type NextRequest } from "next/server"
import { queryOne } from "@/lib/db"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { resolveRequestId } from "@/lib/api/response"
import { logApiRouteError } from "@/lib/api/logging"

export function respondAdminError(request: NextRequest, status: 401 | 403 | 500, message: string, requestId?: string) {
  const resolvedRequestId = requestId ?? resolveRequestId(request)

  return NextResponse.json(
    {
      success: false,
      error: {
        code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
        message,
      },
      requestId: resolvedRequestId,
    },
    {
      status,
      headers: {
        "x-request-id": resolvedRequestId,
        "x-correlation-id": resolvedRequestId,
      },
    },
  )
}

export function respondInternalServerError(
  request: NextRequest,
  error: unknown,
  options: { event: string; requestId?: string; userId?: string | null; errorCode?: string },
) {
  logApiRouteError(request, options.event, error, {
    requestId: options.requestId,
    userId: options.userId,
    errorCode: options.errorCode,
  })

  return respondAdminError(request, 500, "Internal server error", options.requestId)
}

export async function recordAdminAuditLog(entry: {
  actorUserId: number
  action: string
  entityType: string
  entityId?: string | number | null
  metadata?: Record<string, unknown>
}) {
  await ensureAdminAuthMigrationTables()

  await queryOne(
    `INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [entry.actorUserId, entry.action, entry.entityType, entry.entityId ? String(entry.entityId) : null, entry.metadata ?? {}],
  )
}
