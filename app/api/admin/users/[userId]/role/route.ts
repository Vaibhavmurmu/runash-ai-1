import { type NextRequest, NextResponse } from "next/server"
import { RBACManager, DEFAULT_ROLES } from "@/lib/rbac"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { z } from "zod"

const changeRoleSchema = z.object({
  role: z.enum([
    DEFAULT_ROLES.SUPER_ADMIN,
    DEFAULT_ROLES.ADMIN,
    DEFAULT_ROLES.MODERATOR,
    DEFAULT_ROLES.USER,
    DEFAULT_ROLES.GUEST,
  ]),
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
    const userId = Number.parseInt(params.userId)
    const adminId = auth.userId

    // Prevent users from changing their own role
    if (userId === adminId) {
      return NextResponse.json({ message: "Cannot change your own role" }, { status: 400 })
    }

    // Check if admin has permission to assign this role
    if (role === DEFAULT_ROLES.SUPER_ADMIN && auth.session.user.role !== DEFAULT_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can assign super admin role" }, { status: 403 })
    }

    await RBACManager.changeUserRole(userId, role, adminId)

    return NextResponse.json({ message: "Role changed successfully" })
  } catch (error) {
    console.error("Error changing user role:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
