import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const createRoleSchema = z.object({
  name: z.string().min(2).max(64).regex(/^[a-z0-9:_-]+$/i),
  description: z.string().max(300).optional(),
  isSystem: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.list" })
  if (!auth.success) return auth.response

  await ensureAdminAuthMigrationTables()
  const roles = await queryMany(
    `SELECT id, name, description, is_system, created_at, updated_at FROM admin_roles ORDER BY name ASC`,
  )

  return NextResponse.json({ data: roles })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.roles.create",
  })
  if (!auth.success) return auth.response

  const parsed = createRoleSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await ensureAdminAuthMigrationTables()

  const created = await queryOne(
    `INSERT INTO admin_roles (name, description, is_system) VALUES ($1, $2, $3)
     RETURNING id, name, description, is_system, created_at, updated_at`,
    [parsed.data.name, parsed.data.description ?? null, parsed.data.isSystem],
  )

  return NextResponse.json({ data: created }, { status: 201 })
}
