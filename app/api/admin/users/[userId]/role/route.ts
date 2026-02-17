import { type NextRequest, NextResponse } from "next/server"
import { ASSIGNABLE_ADMIN_ROLES, BASELINE_ROLES, DEFAULT_ROLES, RBACManager, normalizeRoleForStorage } from "@/lib/rbac"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { z } from "zod"
import { recordAuthMetric } from "@/lib/auth-observability"
import { logApiRouteError } from "@/lib/api/logging"

const changeRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ADMIN_ROLES),
})

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.role.update",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    const validationResult = changeRoleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Invalid role",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { role } = validationResult.data
    const normalizedRole = normalizeRoleForStorage(role)
    const userId = Number.parseInt(params.userId)
    const adminId = auth.userId

    // Prevent users from changing their own role
    if (userId === adminId) {
      return NextResponse.json({ message: "Cannot change your own role" }, { status: 400 })
    }

    // Check if admin has permission to assign this role
    if (normalizedRole === DEFAULT_ROLES.SUPER_ADMIN && auth.session.user.role !== DEFAULT_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can assign super admin role" }, { status: 403 })
    }

    if (role === BASELINE_ROLES.ADMIN && auth.session.user.role !== DEFAULT_ROLES.SUPER_ADMIN && auth.session.user.role !== DEFAULT_ROLES.ADMIN) {
      return NextResponse.json({ message: "Only admin-level users can assign baseline admin role" }, { status: 403 })
    }

    await RBACManager.changeUserRole(userId, role, adminId)
    recordAuthMetric("admin.role.changed", { adminId, targetUserId: userId, role: normalizedRole })

    return NextResponse.json({ message: "Role changed successfully", requestedRole: role, storedRole: normalizedRole })
  } catch (error) {
    logApiRouteError(request, "admin.users.role.update.failed", error, { errorCode: "ADMIN_ROLE_UPDATE_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
