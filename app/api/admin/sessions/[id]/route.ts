import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

const idSchema = z.coerce.number().int().positive()
const updateSchema = z.object({
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.read" })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()
    const session = await queryOne(
      `SELECT id, user_id, device_id, device_name, ip_address::text AS ip_address, user_agent, is_active, last_activity, created_at
       FROM user_sessions
       WHERE id = $1`,
      [parsedId],
    )

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
    return NextResponse.json({ data: session })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sessions.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SESSION_READ_FAILED",
    })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.update" })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const updated = await queryOne(
      `UPDATE user_sessions
       SET is_active = COALESCE($2, is_active), last_activity = NOW()
       WHERE id = $1
       RETURNING id, user_id, device_id, device_name, ip_address::text AS ip_address, user_agent, is_active, last_activity, created_at`,
      [id, parsed.data.isActive],
    )

    if (!updated) return NextResponse.json({ error: "Session not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "session.updated",
      entityType: "session",
      entityId: updated.id,
      metadata: { isActive: updated.is_active },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sessions.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SESSION_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:logs", "system:control"],
    auditEvent: "admin.sessions.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()
    const deleted = await queryOne(`DELETE FROM user_sessions WHERE id = $1 RETURNING id, user_id`, [parsedId])
    if (!deleted) return NextResponse.json({ error: "Session not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "session.deleted",
      entityType: "session",
      entityId: deleted.id,
      metadata: { userId: deleted.user_id },
    })
    recordAuthMetric("auth.session.revoked", { endpoint: "admin.sessions.delete", adminId: auth.userId })
    await recordSecurityAuditEvent({
      event: "auth.session.revoked",
      actorUserId: auth.userId,
      resource: "admin_user_session",
      request,
      details: {
        kind: "session_revoke",
        outcome: "success",
        targetSessionId: deleted.id,
        targetUserId: deleted.user_id,
        source: "admin",
      },
    })

    return NextResponse.json({ data: deleted })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sessions.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SESSION_DELETE_FAILED",
    })
  }
}
