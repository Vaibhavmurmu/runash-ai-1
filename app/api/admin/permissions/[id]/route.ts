import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const idSchema = z.coerce.number().int().positive()
const updatePermissionSchema = z.object({
  description: z.string().max(300).nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.update",
  })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  const parsed = updatePermissionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureAdminAuthMigrationTables()
  const updated = await queryOne(
    `UPDATE admin_permissions SET description = COALESCE($2, description) WHERE id = $1 RETURNING id, key, description, created_at`,
    [id, parsed.data.description],
  )

  if (!updated) return NextResponse.json({ error: "Permission not found" }, { status: 404 })
  return NextResponse.json({ data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.delete",
  })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  await ensureAdminAuthMigrationTables()
  const deleted = await queryOne(`DELETE FROM admin_permissions WHERE id = $1 RETURNING id, key`, [id])
  if (!deleted) return NextResponse.json({ error: "Permission not found" }, { status: 404 })
  return NextResponse.json({ data: deleted })
}
