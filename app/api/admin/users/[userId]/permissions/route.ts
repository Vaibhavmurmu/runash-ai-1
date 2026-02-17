import { type NextRequest, NextResponse } from "next/server"
import { RBACManager } from "@/lib/rbac"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { recordAuthMetric } from "@/lib/auth-observability"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.users.permissions.read",
  })
  if (!auth.success) return auth.response

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
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.permissions.write",
  })
  if (!auth.success) return auth.response

  try {
    const { permission } = await request.json()
    const userId = Number.parseInt(params.userId)
    const adminId = auth.userId

    await RBACManager.grantPermission(userId, permission, adminId)
    recordAuthMetric("admin.permission.granted", { adminId, targetUserId: userId, permission })

    return NextResponse.json({ message: "Permission granted successfully" })
  } catch (error) {
    logApiRouteError(request, "admin.users.permissions.grant.failed", error, { errorCode: "ADMIN_PERMISSION_GRANT_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.permissions.revoke",
  })
  if (!auth.success) return auth.response

  try {
    const { permission } = await request.json()
    const userId = Number.parseInt(params.userId)
    const adminId = auth.userId

    await RBACManager.revokePermission(userId, permission, adminId)
    recordAuthMetric("admin.permission.revoked", { adminId, targetUserId: userId, permission })

    return NextResponse.json({ message: "Permission revoked successfully" })
  } catch (error) {
    logApiRouteError(request, "admin.users.permissions.revoke.failed", error, { errorCode: "ADMIN_PERMISSION_REVOKE_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
