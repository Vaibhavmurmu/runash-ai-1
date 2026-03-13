import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const idSchema = z.coerce.number().int().positive()
const updatePermissionSchema = z.object({
  description: z.string().max(300).nullable().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.read",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()

    const permission = await queryOne(`SELECT id, key, description, created_at FROM admin_permissions WHERE id = $1`, [parsedId])
    if (!permission) return NextResponse.json({ error: "Permission not found" }, { status: 404 })

    return NextResponse.json({ data: permission })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.permissions.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_READ_FAILED",
    })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.update",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    const parsed = updatePermissionSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await ensureAdminAuthMigrationTables()
    const updated = await queryOne(
      `UPDATE admin_permissions SET description = COALESCE($2, description) WHERE id = $1 RETURNING id, key, description, created_at`,
      [parsedId, parsed.data.description],
    )

    if (!updated) return NextResponse.json({ error: "Permission not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "permission.updated",
      entityType: "permission",
      entityId: parsedId,
      metadata: { fields: Object.keys(parsed.data) },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.permissions.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings", "system:control"],
    auditEvent: "admin.permissions.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = idSchema.parse(id)
    await ensureAdminAuthMigrationTables()
    const deleted = await queryOne(`DELETE FROM admin_permissions WHERE id = $1 RETURNING id, key`, [parsedId])
    if (!deleted) return NextResponse.json({ error: "Permission not found" }, { status: 404 })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "permission.deleted",
      entityType: "permission",
      entityId: deleted.id,
      metadata: { key: deleted.key },
    })

    return NextResponse.json({ data: deleted })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.permissions.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_DELETE_FAILED",
    })
  }
}
