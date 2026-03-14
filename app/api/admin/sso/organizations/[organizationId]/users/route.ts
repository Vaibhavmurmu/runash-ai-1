import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { queryMany, queryOne } from "@/lib/db"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const orgIdSchema = z.coerce.number().int().positive()

const assignTenantSchema = z.object({
  userId: z.coerce.number().int().positive(),
})

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ organizationId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.sso.organizations.users.read",
  })
  if (!auth.success) return auth.response

  try {
    const organizationId = orgIdSchema.parse(params.organizationId)
    const users = await queryMany(
      `SELECT id, email, name, role, sso_organization_id, updated_at
       FROM users
       WHERE sso_organization_id = $1
       ORDER BY updated_at DESC`,
      [organizationId],
    )

    return NextResponse.json({ data: users })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.users.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_TENANT_USERS_READ_FAILED",
    })
  }
}

export async function POST(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ organizationId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.sso.organizations.users.assign",
  })
  if (!auth.success) return auth.response

  try {
    const organizationId = orgIdSchema.parse(params.organizationId)
    const body = assignTenantSchema.parse(await request.json())

    const updated = await queryOne(
      `UPDATE users
       SET sso_organization_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, role, sso_organization_id, updated_at`,
      [organizationId, body.userId],
    )

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "tenant.user.assigned",
      entityType: "user",
      entityId: body.userId,
      metadata: { organizationId },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid user assignment payload", issues: error.issues }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.users.assign.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_TENANT_USER_ASSIGN_FAILED",
    })
  }
}
