import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const roleIdSchema = z.coerce.number().int().positive()
const updateRoleSchema = z.object({
  description: z.string().max(300).nullable().optional(),
  isSystem: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.read" })
  if (!auth.success) return auth.response

  const roleId = roleIdSchema.parse(params.id)
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
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.update" })
  if (!auth.success) return auth.response

  const roleId = roleIdSchema.parse(params.id)
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

  return NextResponse.json({ data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.delete" })
  if (!auth.success) return auth.response

  const roleId = roleIdSchema.parse(params.id)
  await ensureAdminAuthMigrationTables()

  const deleted = await queryOne(`DELETE FROM admin_roles WHERE id = $1 RETURNING id, name`, [roleId])
  if (!deleted) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
