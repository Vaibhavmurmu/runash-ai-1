import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const listSchema = z.object({
  entityType: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
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

  const parsed = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  await ensureAdminAuthMigrationTables()

  const logs = await queryMany(
    `SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at
     FROM admin_audit_logs
     WHERE ($1::text IS NULL OR entity_type = $1)
       AND ($2::text IS NULL OR action = $2)
     ORDER BY created_at DESC
     LIMIT $3`,
    [parsed.entityType ?? null, parsed.action ?? null, parsed.limit],
  )

  return NextResponse.json({ data: logs })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.audit_logs.create",
  })
  if (!auth.success) return auth.response

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
}
