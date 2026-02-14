import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { RBACManager } from "@/lib/rbac"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const permissions = await RBACManager.getUserPermissions(userId)

    return NextResponse.json({
      permissions,
      role: session.user.role,
    })
  } catch (error) {
    logApiRouteError(request, "auth.permissions.fetch_failed", error, { errorCode: "AUTH_PERMISSIONS_FETCH_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
