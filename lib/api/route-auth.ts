import type { NextRequest } from "next/server"

import { respondError } from "@/lib/api/envelope"
import type { ServerAuthSession } from "@/lib/auth/session"
import { getServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "@/lib/rbac"
import { buildTenantScopePredicate, evaluateTenantBoundaryAccess } from "@/lib/api/tenant-guard"

type AuthzOptions = {
  readPermissions?: string[]
  writePermissions?: string[]
}

type RouteSession = {
  id: string
  role?: string | null
  organizationId?: number | null
}

const ADMIN_ROLES = new Set(["admin", "super_admin"])

export function buildAuthzErrorResponse(request: NextRequest, status: 401 | 403): Response {
  const code = status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"
  const message = status === 401 ? "Unauthorized" : "Forbidden"

  return respondError(request, { code, message }, { status, legacy: { error: message } })
}

function parseRbacUserId(userId: string): number | null {
  const parsed = Number.parseInt(userId, 10)
  return Number.isFinite(parsed) ? parsed : null
}

async function hasRequiredPermissions(user: RouteSession, permissions: string[]): Promise<boolean> {
  if (permissions.length === 0) return true

  if (user.role && ADMIN_ROLES.has(user.role)) {
    return true
  }

  const rbacUserId = parseRbacUserId(user.id)
  if (rbacUserId === null) {
    return false
  }

  return RBACManager.hasAnyPermission(rbacUserId, permissions)
}

export async function authorizeRoute(
  request: NextRequest,
  mode: "read" | "write",
  options: AuthzOptions = {},
): Promise<{ ok: true; sessionUser: RouteSession } | { ok: false; response: Response }> {
  const session = await getServerAuthSession(request.headers)
  const sessionUser = session?.user

  if (!sessionUser?.id) {
    return {
      ok: false,
      response: buildAuthzErrorResponse(request, 401),
    }
  }

  const permissions =
    mode === "read"
      ? (options.readPermissions ?? ["dashboard:read", "admin:access"])
      : (options.writePermissions ?? ["content:write", "admin:access"])
  const hasPermission = await hasRequiredPermissions({ id: sessionUser.id, role: sessionUser.role }, permissions)

  if (!hasPermission) {
    return {
      ok: false,
      response: buildAuthzErrorResponse(request, 403),
    }
  }

  return {
    ok: true,
    sessionUser: {
      id: sessionUser.id,
      role: sessionUser.role,
      organizationId: sessionUser.ssoOrganization ?? null,
    },
  }
}

export function resolveSessionOrganizationId(session: ServerAuthSession | null | undefined): number | null {
  return session?.user?.ssoOrganization ?? null
}

export { buildTenantScopePredicate, evaluateTenantBoundaryAccess }

export function resolveScopedUserId(request: NextRequest, sessionUser: RouteSession, explicitUserId?: unknown): string | null {
  const queryUserId = request.nextUrl.searchParams.get("userId")
  const bodyUserId = typeof explicitUserId === "string" ? explicitUserId : undefined
  const requestedUserId = queryUserId ?? bodyUserId

  if (!requestedUserId || requestedUserId === sessionUser.id) {
    return sessionUser.id
  }

  if (sessionUser.role && ADMIN_ROLES.has(sessionUser.role)) {
    return requestedUserId
  }

  return null
}
