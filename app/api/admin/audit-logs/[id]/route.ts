import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const idSchema = z.coerce.number().int().positive()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.audit_logs.read" })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  await ensureAdminAuthMigrationTables()

  const log = await queryOne(`SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at FROM admin_audit_logs WHERE id = $1`, [id])
  if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 })
  return NextResponse.json({ data: log })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.audit_logs.delete",
  })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  await ensureAdminAuthMigrationTables()

  const deleted = await queryOne(`DELETE FROM admin_audit_logs WHERE id = $1 RETURNING id, action, entity_type`, [id])
  if (!deleted) return NextResponse.json({ error: "Audit log not found" }, { status: 404 })
  return NextResponse.json({ data: deleted })
}
