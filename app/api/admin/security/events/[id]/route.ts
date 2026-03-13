import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { respondInternalServerError } from "@/lib/api/admin-route-utils"

const idSchema = z.coerce.number().int().positive()
const patchSchema = z.object({
  details: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:logs"],
    auditEvent: "admin.security.events.read",
  })
  if (!auth.success) return auth.response

  try {
    const id = idSchema.parse(params.id)
    await ensureAdminAuthMigrationTables()

    const row = await queryOne(
      `SELECT id, admin_id, action, target_type, target_id, details, ip_address::text AS ip_address, user_agent, created_at
       FROM admin_activity_logs
       WHERE id = $1 AND target_type = 'security_event'`,
      [id],
    )

    if (!row) return NextResponse.json({ error: "Security event not found" }, { status: 404 })
    return NextResponse.json({ data: row })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.security.events.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SECURITY_EVENT_READ_FAILED",
    })
  }
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.security.events.update",
  })
  if (!auth.success) return auth.response

  try {
    const id = idSchema.parse(params.id)
    const parsed = patchSchema.parse(await request.json())
    await ensureAdminAuthMigrationTables()

    const row = await queryOne(
      `UPDATE admin_activity_logs
       SET details = COALESCE($2, details)
       WHERE id = $1 AND target_type = 'security_event'
       RETURNING id, admin_id, action, target_type, target_id, details, ip_address::text AS ip_address, user_agent, created_at`,
      [id, parsed.details],
    )

    if (!row) return NextResponse.json({ error: "Security event not found" }, { status: 404 })
    return NextResponse.json({ data: row })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.security.events.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SECURITY_EVENT_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:control"],
    auditEvent: "admin.security.events.delete",
  })
  if (!auth.success) return auth.response

  try {
    const id = idSchema.parse(params.id)
    await ensureAdminAuthMigrationTables()

    const deleted = await queryOne(`DELETE FROM admin_activity_logs WHERE id = $1 AND target_type = 'security_event' RETURNING id`, [id])
    if (!deleted) return NextResponse.json({ error: "Security event not found" }, { status: 404 })

    return NextResponse.json({ data: deleted })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.security.events.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SECURITY_EVENT_DELETE_FAILED",
    })
  }
}
