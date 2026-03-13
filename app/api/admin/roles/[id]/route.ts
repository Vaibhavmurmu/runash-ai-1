import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const roleIdSchema = z.coerce.number().int().positive()
const updateRoleSchema = z.object({
  description: z.string().max(300).nullable().optional(),
  isSystem: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.read" })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const roleId = roleIdSchema.parse(id)
    await ensureAdminAuthMigrationTables()

    const role = await queryOne(`SELECT id, name, description, is_system, created_at, updated_at FROM admin_roles WHERE id = $1`, [roleId])
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    const permissions = await queryMany(
      `SELECT p.id, p.key, p.description FROM admin_role_permissions rp JOIN admin_permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1 ORDER BY p.key ASC`,
      [roleId],
    )

    return NextResponse.json({ data: { ...role, permissions } })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.roles.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_ROLE_READ_FAILED",
    })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.update" })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const roleId = roleIdSchema.parse(id)
    const parsed = updateRoleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await ensureAdminAuthMigrationTables()

    const updated = await queryOne(
      `UPDATE admin_roles SET description = COALESCE($2, description), is_system = COALESCE($3, is_system), updated_at = NOW() WHERE id = $1
       RETURNING id, name, description, is_system, created_at, updated_at`,
      [roleId, parsed.data.description, parsed.data.isSystem],
    )

    if (!updated) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "role.updated",
      entityType: "role",
      entityId: roleId,
      metadata: { fields: Object.keys(parsed.data) },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.roles.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_ROLE_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings", "system:control"],
    auditEvent: "admin.roles.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const roleId = roleIdSchema.parse(id)
    await ensureAdminAuthMigrationTables()

    const deleted = await queryOne(`DELETE FROM admin_roles WHERE id = $1 RETURNING id, name`, [roleId])
    if (!deleted) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "role.deleted",
      entityType: "role",
      entityId: deleted.id,
      metadata: { name: deleted.name },
    })

    return NextResponse.json({ data: deleted })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.roles.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_ROLE_DELETE_FAILED",
    })
  }
}
