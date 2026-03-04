import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { respondInternalServerError } from "@/lib/api/admin-route-utils"

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().max(100).optional(),
  adminId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(150).optional(),
})

const createSchema = z.object({
  action: z.string().min(2).max(100),
  details: z.record(z.unknown()).default({}),
  targetId: z.coerce.number().int().positive().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:logs"],
    auditEvent: "admin.security.events.list",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    await ensureAdminAuthMigrationTables()
    const offset = (parsed.page - 1) * parsed.limit
    const searchFilter = parsed.search ? `%${parsed.search}%` : null

    const [countRow] = await queryMany<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM admin_activity_logs
       WHERE target_type = 'security_event'
         AND ($1::text IS NULL OR action = $1)
         AND ($2::int IS NULL OR admin_id = $2)
         AND (
           $3::text IS NULL
           OR action ILIKE $3
           OR COALESCE(target_id::text, '') ILIKE $3
           OR details::text ILIKE $3
         )`,
      [parsed.action ?? null, parsed.adminId ?? null, searchFilter],
    )

    const rows = await queryMany(
      `SELECT id, admin_id, action, target_type, target_id, details, ip_address::text AS ip_address, user_agent, created_at
       FROM admin_activity_logs
       WHERE target_type = 'security_event'
         AND ($1::text IS NULL OR action = $1)
         AND ($2::int IS NULL OR admin_id = $2)
         AND (
           $3::text IS NULL
           OR action ILIKE $3
           OR COALESCE(target_id::text, '') ILIKE $3
           OR details::text ILIKE $3
         )
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [parsed.action ?? null, parsed.adminId ?? null, searchFilter, parsed.limit, offset],
    )

    return NextResponse.json({
      data: rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: Number.parseInt(countRow?.total ?? "0", 10) },
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.security.events.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SECURITY_EVENTS_LIST_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.security.events.create",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = createSchema.parse(await request.json())
    await ensureAdminAuthMigrationTables()

    const created = await queryOne(
      `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, 'security_event', $3, $4, NOW())
       RETURNING id, admin_id, action, target_type, target_id, details, ip_address::text AS ip_address, user_agent, created_at`,
      [auth.userId, parsed.action, parsed.targetId ?? null, parsed.details],
    )

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.security.events.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SECURITY_EVENTS_CREATE_FAILED",
    })
  }
}
