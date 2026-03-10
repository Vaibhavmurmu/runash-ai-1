import { getServerAuthSession } from "@/lib/auth/session"
import { respondError } from "@/lib/api/envelope"

export type DashboardTenantContext = {
  userId: string
  role: string
  tenantId: string
}

export async function requireDashboardTenantContext(request: Request): Promise<DashboardTenantContext | Response> {
  const session = await getServerAuthSession(request.headers)
  const sessionUserId = session?.user?.id?.toString().trim()

  if (!sessionUserId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401, legacy: { error: "Unauthorized" } })
  }

  const scopedHeaderUserId = request.headers.get("x-user-id")?.trim()
  if (scopedHeaderUserId && scopedHeaderUserId !== sessionUserId) {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const role = session?.user?.role?.toString().trim().toLowerCase() || "user"
  const organizationId = session?.user?.ssoOrganization
  const tenantId = typeof organizationId === "number" ? `org:${organizationId}` : `user:${sessionUserId}`

  return {
    userId: sessionUserId,
    role,
    tenantId,
  }
}

export async function requireDashboardSessionUserId(request: Request): Promise<string | Response> {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) {
    return context
  }

  return context.userId
}

export function canManageMcpConnectors(context: DashboardTenantContext) {
  return context.role === "admin" || context.role === "super_admin"
}
