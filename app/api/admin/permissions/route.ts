import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const createPermissionSchema = z.object({
  key: z.string().min(3).max(100).regex(/^[a-z0-9:_-]+$/i),
  description: z.string().max(300).optional(),
})

const listPermissionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(100).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.list",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = listPermissionsSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    await ensureAdminAuthMigrationTables()
    const offset = (parsed.page - 1) * parsed.limit
    const filter = parsed.search ? `%${parsed.search}%` : null
    const [countRow] = await queryMany<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM admin_permissions WHERE ($1::text IS NULL OR key ILIKE $1)`,
      [filter],
    )
    const permissions = await queryMany(
      `SELECT id, key, description, created_at
       FROM admin_permissions
       WHERE ($1::text IS NULL OR key ILIKE $1)
       ORDER BY key ASC
       LIMIT $2 OFFSET $3`,
      [filter, parsed.limit, offset],
    )
    return NextResponse.json({
      data: permissions,
      pagination: { page: parsed.page, limit: parsed.limit, total: Number.parseInt(countRow?.total ?? "0", 10) },
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.permissions.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_LIST_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.permissions.create",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = createPermissionSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await ensureAdminAuthMigrationTables()
    const permission = await queryOne(
      `INSERT INTO admin_permissions (key, description) VALUES ($1, $2)
       RETURNING id, key, description, created_at`,
      [parsed.data.key, parsed.data.description ?? null],
    )

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "permission.created",
      entityType: "permission",
      entityId: permission?.id,
      metadata: { key: parsed.data.key },
    })

    return NextResponse.json({ data: permission }, { status: 201 })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.permissions.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_CREATE_FAILED",
    })
  }
}
