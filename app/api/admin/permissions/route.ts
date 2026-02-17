import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const createPermissionSchema = z.object({
  key: z.string().min(3).max(100).regex(/^[a-z0-9:_-]+$/i),
  description: z.string().max(300).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.list",
  })
  if (!auth.success) return auth.response

  await ensureAdminAuthMigrationTables()
  const permissions = await queryMany(`SELECT id, key, description, created_at FROM admin_permissions ORDER BY key ASC`)
  return NextResponse.json({ data: permissions })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.create",
  })
  if (!auth.success) return auth.response

  const parsed = createPermissionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureAdminAuthMigrationTables()
  const permission = await queryOne(
    `INSERT INTO admin_permissions (key, description) VALUES ($1, $2)
     RETURNING id, key, description, created_at`,
    [parsed.data.key, parsed.data.description ?? null],
  )

  return NextResponse.json({ data: permission }, { status: 201 })
}
