import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession, type ServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "./rbac"
import { resolveRequiredAdminPermissions } from "@/lib/auth/admin-authorization-handler"
import { neon } from "@neondatabase/serverless"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"

const sql = neon(process.env.DATABASE_URL!)

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[]
  requiredRole?: string
  requireAnyPermission?: boolean // If true, user needs ANY of the permissions, not ALL
  redirectTo?: string
  responseMode?: "redirect" | "json"
}

function authErrorResponse(request: NextRequest, status: 401 | 403, message: string, requestId: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        message,
      },
      requestId,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
        "x-correlation-id": requestId,
      },
    },
  )
}

export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {},
): Promise<NextResponse | null> {
  const {
    requiredPermissions = [],
    requiredRole,
    requireAnyPermission = false,
    redirectTo = "/login",
    responseMode = "redirect",
  } = options

  try {
    const session = await getServerAuthSession(request.headers)
    const token = session?.user
    const requestId = resolveRequestId(request)

    if (!token || !token.id) {
      return responseMode === "json"
        ? authErrorResponse(request, 401, "Unauthorized", requestId)
        : NextResponse.redirect(new URL(redirectTo, request.url))
    }

    const userId = Number.parseInt(token.id)

    if (requiredRole && token.role !== requiredRole) {
      if (!RBACManager.isRoleHigher(token.role as string, requiredRole)) {
        return responseMode === "json"
          ? authErrorResponse(request, 403, "Insufficient permissions", requestId)
          : NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    if (requiredPermissions.length > 0) {
      const hasPermission = requireAnyPermission
        ? await RBACManager.hasAnyPermission(userId, requiredPermissions)
        : await RBACManager.hasAllPermissions(userId, requiredPermissions)

      if (!hasPermission) {
        return responseMode === "json"
          ? authErrorResponse(request, 403, "Insufficient permissions", requestId)
          : NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    return null
  } catch (error) {
    console.error("Auth middleware error:", error)
    return NextResponse.json({ message: "Authentication error" }, { status: 500 })
  }
}

export interface RequireAdminAuthorizationOptions {
  requiredPermissions?: string[]
  requireAnyPermission?: boolean
  auditEvent: string
}

type AdminAuthResult =
  | { success: true; session: ServerAuthSession; userId: number; requestId: string }
  | { success: false; response: NextResponse }

export async function requireAdminAuthorization(
  request: NextRequest,
  options: RequireAdminAuthorizationOptions,
): Promise<AdminAuthResult> {
  const requestId = resolveRequestId(request)
  const session = await getServerAuthSession(request.headers)
  const token = session?.user

  if (!token?.id) {
    logApiEvent("warn", `${options.auditEvent}.unauthorized`, {
      requestId,
      route: request.nextUrl.pathname,
      method: request.method,
      details: {
        reason: "missing_session",
      },
    })

    return {
      success: false,
      response: authErrorResponse(request, 401, "Unauthorized", requestId),
    }
  }

  const userId = Number.parseInt(token.id)
  const requiredPermissions = resolveRequiredAdminPermissions({
    pathname: request.nextUrl.pathname,
    method: request.method,
    explicitPermissions: options.requiredPermissions,
  })

  const hasPermission = options.requireAnyPermission
    ? await RBACManager.hasAnyPermission(userId, requiredPermissions)
    : await RBACManager.hasAllPermissions(userId, requiredPermissions)

  if (!hasPermission) {
    logApiEvent("warn", `${options.auditEvent}.forbidden`, {
      requestId,
      route: request.nextUrl.pathname,
      method: request.method,
      userId: token.id,
      details: {
        requiredPermissions,
      },
    })

    return {
      success: false,
      response: authErrorResponse(request, 403, "Forbidden", requestId),
    }
  }

  logApiEvent("info", `${options.auditEvent}.allowed`, {
    requestId,
    route: request.nextUrl.pathname,
    method: request.method,
    userId: token.id,
  })

  return {
    success: true,
    session,
    userId,
    requestId,
  }
}

export function requireAuth(options: AuthMiddlewareOptions = {}) {
  return async (request: NextRequest) => {
    const authResult = await withAuth(request, options)
    if (authResult) {
      return authResult
    }
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
