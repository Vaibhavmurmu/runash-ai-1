import { type NextRequest, NextResponse } from "next/server"
import { RBACManager } from "@/lib/rbac"
import { withAuth } from "@/lib/auth-middleware"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const authResult = await withAuth(request, {
    requiredPermissions: ["users:read", "admin:access"],
  })
  if (authResult) return authResult

  try {
    const userId = Number.parseInt(params.userId)
    const permissions = await RBACManager.getUserPermissions(userId)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const authResult = await withAuth(request, {
    requiredPermissions: ["users:write", "admin:access"],
  })
  if (authResult) return authResult

  try {
    const session = await getServerAuthSession()
    const { permission } = await request.json()
    const userId = Number.parseInt(params.userId)
    const adminId = Number.parseInt(session!.user.id)

    await RBACManager.grantPermission(userId, permission, adminId)

    return NextResponse.json({ message: "Permission granted successfully" })
  } catch (error) {
    console.error("Error granting permission:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const authResult = await withAuth(request, {
    requiredPermissions: ["users:write", "admin:access"],
  })
  if (authResult) return authResult

  try {
    const session = await getServerAuthSession()
    const { permission } = await request.json()
    const userId = Number.parseInt(params.userId)
    const adminId = Number.parseInt(session!.user.id)

    await RBACManager.revokePermission(userId, permission, adminId)

    return NextResponse.json({ message: "Permission revoked successfully" })
  } catch (error) {
    console.error("Error revoking permission:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
