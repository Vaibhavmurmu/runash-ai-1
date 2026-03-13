import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { queryOne } from "@/lib/db"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const idSchema = z.coerce.number().int().positive()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; userId: string }> },
) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.sso.organizations.users.unassign",
  })
  if (!auth.success) return auth.response

  try {
    const { organizationId, userId } = await params
    const parsedOrganizationId = idSchema.parse(organizationId)
    const parsedUserId = idSchema.parse(userId)

    const updated = await queryOne(
      `UPDATE users
       SET sso_organization_id = NULL,
           updated_at = NOW()
       WHERE id = $1 AND sso_organization_id = $2
       RETURNING id, email, name, role, sso_organization_id, updated_at`,
      [parsedUserId, parsedOrganizationId],
    )

    if (!updated) {
      return NextResponse.json({ error: "Tenant user mapping not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "tenant.user.unassigned",
      entityType: "user",
      entityId: parsedUserId,
      metadata: { organizationId: parsedOrganizationId },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tenant user identifiers", issues: error.issues }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.users.unassign.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_TENANT_USER_UNASSIGN_FAILED",
    })
  }
}
