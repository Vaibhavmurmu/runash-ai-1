import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "./rbac"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[]
  requiredRole?: string
  requireAnyPermission?: boolean // If true, user needs ANY of the permissions, not ALL
  redirectTo?: string
}

export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {},
): Promise<NextResponse | null> {
  const { requiredPermissions = [], requiredRole, requireAnyPermission = false, redirectTo = "/login" } = options

  try {
    const session = await getServerAuthSession(request.headers)
    const token = session?.user

    if (!token || !token.id) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }

    const userId = Number.parseInt(token.id)

    // Check role requirement
    if (requiredRole && token.role !== requiredRole) {
      // Check if user's role is higher in hierarchy
      if (!RBACManager.isRoleHigher(token.role as string, requiredRole)) {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      const hasPermission = requireAnyPermission
        ? await RBACManager.hasAnyPermission(userId, requiredPermissions)
        : await RBACManager.hasAllPermissions(userId, requiredPermissions)

      if (!hasPermission) {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    return null // Allow request to continue
  } catch (error) {
    console.error("Auth middleware error:", error)
    return NextResponse.json({ message: "Authentication error" }, { status: 500 })
  }
}

// Higher-order function for API route protection
export function requireAuth(options: AuthMiddlewareOptions = {}) {
  return async (request: NextRequest) => {
    const authResult = await withAuth(request, options)
    if (authResult) {
      return authResult
    }
    // If auth passes, continue to the actual handler
    return null
  }
}

export async function requirePermission(userId: string, permission: string): Promise<boolean> {
  try {
    return await RBACManager.hasPermission(Number.parseInt(userId), permission)
  } catch (error) {
    console.error("Permission check error:", error)
    return false
  }
}

export async function logAdminActivity(userId: string, action: string, details: any, ipAddress: string): Promise<void> {
  try {
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, action, details, ip_address)
      VALUES (${userId}, ${action}, ${JSON.stringify(details)}, ${ipAddress})
    `
  } catch (error) {
    console.error("Failed to log admin activity:", error)
  }
}
