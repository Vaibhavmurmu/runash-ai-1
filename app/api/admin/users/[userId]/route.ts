import { type NextRequest, NextResponse } from "next/server"
import { UserManager } from "@/lib/user-management"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ASSIGNABLE_ADMIN_ROLES, normalizeRoleForStorage } from "@/lib/rbac"

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

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.users.read",
  })
  if (!auth.success) return auth.response

  try {
    const userId = Number.parseInt(params.userId)
    const user = await UserManager.getUserById(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.update",
  })
  if (!auth.success) return auth.response

  try {
    const userId = Number.parseInt(params.userId)
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)
    const normalizedData = {
      ...validatedData,
      ...(validatedData.role ? { role: normalizeRoleForStorage(validatedData.role) } : {}),
    }

    const updatedUser = await UserManager.updateUser(userId, normalizedData, auth.userId)

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:delete"],
    auditEvent: "admin.users.delete",
  })
  if (!auth.success) return auth.response

  try {
    const userId = Number.parseInt(params.userId)
    await UserManager.deleteUser(userId, auth.userId)

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
