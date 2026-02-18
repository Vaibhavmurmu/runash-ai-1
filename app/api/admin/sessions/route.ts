import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isIP } from "node:net"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const listSchema = z.object({
  userId: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  deviceName: z.string().trim().max(128).optional(),
  search: z.string().trim().max(150).optional(),
})

const createSessionSchema = z.object({
  userId: z.string().min(1),
  deviceId: z.string().min(1).max(128),
  deviceName: z.string().min(1).max(128),
  ipAddress: z.string().refine((value) => isIP(value) !== 0, "Invalid IP address format"),
  userAgent: z.string().min(1).max(1000),
  isActive: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.list" })
  if (!auth.success) return auth.response

  try {
    const parsed = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    await ensureAdminAuthMigrationTables()
    const offset = (parsed.page - 1) * parsed.limit
    const deviceNameFilter = parsed.deviceName ? `%${parsed.deviceName}%` : null
    const searchFilter = parsed.search ? `%${parsed.search}%` : null
    const [countRow] = await queryMany<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM user_sessions
       WHERE ($1::text IS NULL OR user_id::text = $1)
         AND ($2::boolean IS NULL OR is_active = $2)
         AND ($3::text IS NULL OR device_name ILIKE $3)
         AND (
           $4::text IS NULL
           OR device_id ILIKE $4
           OR device_name ILIKE $4
           OR user_agent ILIKE $4
           OR ip_address::text ILIKE $4
         )`,
      [parsed.userId ?? null, parsed.isActive ? parsed.isActive === "true" : null, deviceNameFilter, searchFilter],
    )
    const sessions = await queryMany(
      `SELECT id, user_id, device_id, device_name, ip_address::text AS ip_address, user_agent, is_active, last_activity, created_at
       FROM user_sessions
       WHERE ($1::text IS NULL OR user_id::text = $1)
         AND ($2::boolean IS NULL OR is_active = $2)
         AND ($3::text IS NULL OR device_name ILIKE $3)
         AND (
           $4::text IS NULL
           OR device_id ILIKE $4
           OR device_name ILIKE $4
           OR user_agent ILIKE $4
           OR ip_address::text ILIKE $4
         )
       ORDER BY created_at DESC
       LIMIT $5 OFFSET $6`,
      [parsed.userId ?? null, parsed.isActive ? parsed.isActive === "true" : null, deviceNameFilter, searchFilter, parsed.limit, offset],
    )

    return NextResponse.json({
      data: sessions,
      pagination: { page: parsed.page, limit: parsed.limit, total: Number.parseInt(countRow?.total ?? "0", 10) },
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sessions.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SESSIONS_LIST_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.create" })
  if (!auth.success) return auth.response

  try {
    const parsed = createSessionSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    await ensureAdminAuthMigrationTables()

    const created = await queryOne(
      `INSERT INTO user_sessions (user_id, device_id, device_name, ip_address, user_agent, is_active, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, user_id, device_id, device_name, ip_address::text AS ip_address, user_agent, is_active, last_activity, created_at`,
      [
        parsed.data.userId,
        parsed.data.deviceId,
        parsed.data.deviceName,
        parsed.data.ipAddress,
        parsed.data.userAgent,
        parsed.data.isActive,
      ],
    )

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "session.created",
      entityType: "session",
      entityId: created?.id,
      metadata: { userId: parsed.data.userId, deviceId: parsed.data.deviceId },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sessions.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SESSION_CREATE_FAILED",
    })
  }
}
