import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const createRoleSchema = z.object({
  name: z.string().min(2).max(64).regex(/^[a-z0-9:_-]+$/i),
  description: z.string().max(300).optional(),
  isSystem: z.boolean().optional().default(false),
})

const listRolesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(64).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["admin:settings"], auditEvent: "admin.roles.list" })
  if (!auth.success) return auth.response

  try {
    await ensureAdminAuthMigrationTables()
    const parsed = listRolesSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    const offset = (parsed.page - 1) * parsed.limit
    const filter = parsed.search ? `%${parsed.search}%` : null

    const [countRow] = await queryMany<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM admin_roles WHERE ($1::text IS NULL OR name ILIKE $1)`,
      [filter],
    )
    const roles = await queryMany(
      `SELECT id, name, description, is_system, created_at, updated_at
       FROM admin_roles
       WHERE ($1::text IS NULL OR name ILIKE $1)
       ORDER BY name ASC
       LIMIT $2 OFFSET $3`,
      [filter, parsed.limit, offset],
    )

    return NextResponse.json({
      data: roles,
      pagination: { page: parsed.page, limit: parsed.limit, total: Number.parseInt(countRow?.total ?? "0", 10) },
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.roles.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_ROLE_LIST_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.roles.create",
  })
  if (!auth.success) return auth.response

  try {
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

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "role.created",
      entityType: "role",
      entityId: created?.id,
      metadata: { name: parsed.data.name },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.roles.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_ROLE_CREATE_FAILED",
    })
  }
}
