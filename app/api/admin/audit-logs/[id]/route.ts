import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const idSchema = z.coerce.number().int().positive()
const updateAuditSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.audit_logs.read" })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()

    const log = await queryOne(`SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at FROM admin_audit_logs WHERE id = $1`, [parsedId])
    if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 })
    return NextResponse.json({ data: log })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.audit_logs.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_AUDIT_LOG_READ_FAILED",
    })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.audit_logs.update",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    const parsed = updateAuditSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await ensureAdminAuthMigrationTables()

    const updated = await queryOne(
      `UPDATE admin_audit_logs SET metadata = COALESCE($2, metadata) WHERE id = $1
       RETURNING id, actor_user_id, action, entity_type, entity_id, metadata, created_at`,
      [parsedId, parsed.data.metadata],
    )

    if (!updated) return NextResponse.json({ error: "Audit log not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "audit_log.updated",
      entityType: "audit_log",
      entityId: updated.id,
      metadata: { updatedMetadata: Boolean(parsed.data.metadata) },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.audit_logs.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_AUDIT_LOG_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings", "system:control"],
    auditEvent: "admin.audit_logs.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()

    const deleted = await queryOne(`DELETE FROM admin_audit_logs WHERE id = $1 RETURNING id, action, entity_type`, [parsedId])
    if (!deleted) return NextResponse.json({ error: "Audit log not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "audit_log.deleted",
      entityType: "audit_log",
      entityId: deleted.id,
      metadata: { action: deleted.action, entityType: deleted.entity_type },
    })

    return NextResponse.json({ data: deleted })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.audit_logs.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_AUDIT_LOG_DELETE_FAILED",
    })
  }
}
