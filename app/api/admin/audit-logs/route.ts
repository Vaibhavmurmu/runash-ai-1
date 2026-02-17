import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { respondInternalServerError } from "@/lib/api/admin-route-utils"

const listSchema = z.object({
  entityType: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const createSchema = z.object({
  action: z.string().min(2).max(100),
  entityType: z.string().min(2).max(100),
  entityId: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.audit_logs.list" })
  if (!auth.success) return auth.response

  try {
    const parsed = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    await ensureAdminAuthMigrationTables()
    const offset = (parsed.page - 1) * parsed.limit

    const [countRow] = await queryMany<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM admin_audit_logs
       WHERE ($1::text IS NULL OR entity_type = $1)
         AND ($2::text IS NULL OR action = $2)`,
      [parsed.entityType ?? null, parsed.action ?? null],
    )

    const logs = await queryMany(
      `SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at
       FROM admin_audit_logs
       WHERE ($1::text IS NULL OR entity_type = $1)
         AND ($2::text IS NULL OR action = $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [parsed.entityType ?? null, parsed.action ?? null, parsed.limit, offset],
    )

    return NextResponse.json({
      data: logs,
      pagination: { page: parsed.page, limit: parsed.limit, total: Number.parseInt(countRow?.total ?? "0", 10) },
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.audit_logs.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_AUDIT_LOGS_LIST_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.audit_logs.create",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await ensureAdminAuthMigrationTables()
    const log = await queryOne(
      `INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, actor_user_id, action, entity_type, entity_id, metadata, created_at`,
      [auth.userId, parsed.data.action, parsed.data.entityType, parsed.data.entityId ?? null, parsed.data.metadata ?? {}],
    )

    return NextResponse.json({ data: log }, { status: 201 })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.audit_logs.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_AUDIT_LOG_CREATE_FAILED",
    })
  }
}
