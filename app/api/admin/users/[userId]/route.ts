import { type NextRequest, NextResponse } from "next/server"
import { UserManager } from "@/lib/user-management"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ASSIGNABLE_ADMIN_ROLES, normalizeRoleForStorage } from "@/lib/rbac"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"
import { enforceAdminUserTenantBoundary, migrateLegacyUserOrganizationIfNeeded } from "../tenant-guard"

const updateUserSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(ASSIGNABLE_ADMIN_ROLES).optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  avatar_url: z.string().url().optional(),
})

const userIdSchema = z.coerce.number().int().positive()

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.users.read",
  })
  if (!auth.success) return auth.response

  try {
    const userId = userIdSchema.parse(params.userId)
    const tenantGuard = await enforceAdminUserTenantBoundary(userId, auth.session.user.ssoOrganization)
    if (!tenantGuard.ok) return tenantGuard.response

    const user = await UserManager.getUserById(userId, { sessionOrganizationId: auth.session.user.ssoOrganization })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USER_READ_FAILED",
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.update",
  })
  if (!auth.success) return auth.response

  try {
    const userId = userIdSchema.parse(params.userId)
    const tenantGuard = await enforceAdminUserTenantBoundary(userId, auth.session.user.ssoOrganization)
    if (!tenantGuard.ok) return tenantGuard.response

    await migrateLegacyUserOrganizationIfNeeded(
      userId,
      auth.session.user.ssoOrganization,
      tenantGuard.shouldMigrateLegacyOrganization,
    )

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)
    const normalizedData = {
      ...validatedData,
      ...(validatedData.role ? { role: normalizeRoleForStorage(validatedData.role) } : {}),
    }

    const updatedUser = await UserManager.updateUser(userId, normalizedData, auth.userId, { sessionOrganizationId: auth.session.user.ssoOrganization })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "user.updated",
      entityType: "user",
      entityId: userId,
      metadata: { fields: Object.keys(validatedData) },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USER_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:delete", "system:control"],
    auditEvent: "admin.users.delete",
  })
  if (!auth.success) return auth.response

  try {
    const userId = userIdSchema.parse(params.userId)
    const tenantGuard = await enforceAdminUserTenantBoundary(userId, auth.session.user.ssoOrganization)
    if (!tenantGuard.ok) return tenantGuard.response

    await migrateLegacyUserOrganizationIfNeeded(
      userId,
      auth.session.user.ssoOrganization,
      tenantGuard.shouldMigrateLegacyOrganization,
    )

    await UserManager.deleteUser(userId, auth.userId, { sessionOrganizationId: auth.session.user.ssoOrganization })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "user.deleted",
      entityType: "user",
      entityId: userId,
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.delete.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USER_DELETE_FAILED",
    })
  }
}
