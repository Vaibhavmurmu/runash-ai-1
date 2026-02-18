import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession, type ServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "./rbac"
import { resolveRequiredAdminPermissions } from "@/lib/auth/admin-authorization-handler"
import { neon } from "@neondatabase/serverless"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import { respondAdminError } from "@/lib/api/admin-route-utils"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

const sql = neon(process.env.DATABASE_URL!)

export interface AuthMiddlewareOptions {
  requiredPermissions?: string[]
  requiredRole?: string
  requireAnyPermission?: boolean // If true, user needs ANY of the permissions, not ALL
  redirectTo?: string
  responseMode?: "redirect" | "json"
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
        ? respondAdminError(request, 401, "Unauthorized", requestId)
        : NextResponse.redirect(new URL(redirectTo, request.url))
    }

    const userId = Number.parseInt(token.id)

    if (requiredRole && token.role !== requiredRole) {
      if (!RBACManager.isRoleHigher(token.role as string, requiredRole)) {
        return responseMode === "json"
          ? respondAdminError(request, 403, "Insufficient permissions", requestId)
          : NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    if (requiredPermissions.length > 0) {
      const hasPermission = requireAnyPermission
        ? await RBACManager.hasAnyPermission(userId, requiredPermissions)
        : await RBACManager.hasAllPermissions(userId, requiredPermissions)

      if (!hasPermission) {
        return responseMode === "json"
          ? respondAdminError(request, 403, "Insufficient permissions", requestId)
          : NextResponse.json({ message: "Insufficient permissions" }, { status: 403 })
      }
    }

    return null
  } catch (error) {
    logApiEvent("error", "auth.middleware.error", {
      requestId: resolveRequestId(request),
      route: request.nextUrl.pathname,
      method: request.method,
      error,
    })
    return respondAdminError(request, 500, "Internal server error", resolveRequestId(request))
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

  try {
    const session = await getServerAuthSession(request.headers)
    const token = session?.user

    if (!token?.id) {
      recordAuthMetric("auth.forbidden.action", {
        endpoint: request.nextUrl.pathname,
        reason: "missing_session",
        method: request.method,
      })
      await recordSecurityAuditEvent({
        event: "auth.forbidden.access",
        resource: request.nextUrl.pathname,
        request,
        details: {
          kind: "auth",
          outcome: "unauthorized",
          reason: "missing_session",
          method: request.method,
          auditEvent: options.auditEvent,
        },
      })
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
        response: respondAdminError(request, 401, "Unauthorized", requestId),
      }
    }

    const userId = Number.parseInt(token.id)
    if (!Number.isFinite(userId)) {
      recordAuthMetric("auth.forbidden.action", {
        endpoint: request.nextUrl.pathname,
        reason: "invalid_user_id",
        method: request.method,
      })
      await recordSecurityAuditEvent({
        event: "auth.forbidden.access",
        resource: request.nextUrl.pathname,
        request,
        details: {
          kind: "auth",
          outcome: "unauthorized",
          reason: "invalid_user_id",
          method: request.method,
          auditEvent: options.auditEvent,
        },
      })
      logApiEvent("warn", `${options.auditEvent}.unauthorized`, {
        requestId,
        route: request.nextUrl.pathname,
        method: request.method,
        details: {
          reason: "invalid_user_id",
        },
      })

      return {
        success: false,
        response: respondAdminError(request, 401, "Unauthorized", requestId),
      }
    }

    const requiredPermissions = resolveRequiredAdminPermissions({
      pathname: request.nextUrl.pathname,
      method: request.method,
      explicitPermissions: options.requiredPermissions,
    })

    const hasPermission = options.requireAnyPermission
      ? await RBACManager.hasAnyPermission(userId, requiredPermissions)
      : await RBACManager.hasAllPermissions(userId, requiredPermissions)

    if (!hasPermission) {
      recordAuthMetric("auth.forbidden.action", {
        endpoint: request.nextUrl.pathname,
        method: request.method,
        reason: "missing_permissions",
      })
      recordAuthMetric("auth.permission.abuse", {
        endpoint: request.nextUrl.pathname,
        method: request.method,
        reason: "permission_denied",
      })
      await recordSecurityAuditEvent({
        event: "auth.forbidden.access",
        actorUserId: token.id,
        resource: request.nextUrl.pathname,
        request,
        details: {
          kind: "authorization",
          outcome: "forbidden",
          reason: "missing_permissions",
          method: request.method,
          requiredPermissions,
          auditEvent: options.auditEvent,
        },
      })
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
        response: respondAdminError(request, 403, "Forbidden", requestId),
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
  } catch (error) {
    logApiEvent("error", `${options.auditEvent}.error`, {
      requestId,
      route: request.nextUrl.pathname,
      method: request.method,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })

    return {
      success: false,
      response: respondAdminError(request, 500, "Internal server error", requestId),
    }
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
  } catch {
    console.error("Permission check failed")
    return false
  }
}

export async function logAdminActivity(userId: string, action: string, details: any, ipAddress: string): Promise<void> {
  try {
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, action, details, ip_address)
      VALUES (${userId}, ${action}, ${JSON.stringify(details)}, ${ipAddress})
    `
  } catch {
    console.error("Failed to log admin activity")
  }
}
