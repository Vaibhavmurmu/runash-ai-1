import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

const idSchema = z.string().uuid()
const updateSchema = z.object({
  isActive: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.update" })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await queryOne(
    `UPDATE user_sessions
     SET is_active = COALESCE($2, is_active), last_activity = NOW()
     WHERE id = $1
     RETURNING id, user_id, device_id, device_name, ip_address::text AS ip_address, user_agent, is_active, last_activity, created_at`,
    [id, parsed.data.isActive],
  )

  if (!updated) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({ data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthorization(request, { requiredPermissions: ["system:logs"], auditEvent: "admin.sessions.delete" })
  if (!auth.success) return auth.response

  const id = idSchema.parse(params.id)
  const deleted = await queryOne(`DELETE FROM user_sessions WHERE id = $1 RETURNING id, user_id`, [id])
  if (!deleted) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({ data: deleted })
}
