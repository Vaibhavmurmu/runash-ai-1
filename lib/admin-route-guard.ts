import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getServerAuthSession } from "@/lib/auth/session"
import { getRouteRequiredPermissions, RBACManager } from "@/lib/rbac"

export async function requireAdminUiRouteAccess(routePath: string): Promise<void> {
  const session = await getServerAuthSession(headers())
  const token = session?.user

  if (!token?.id) {
    redirect("/login")
  }

  const userId = Number.parseInt(token.id)
  const requiredPermissions = Array.from(new Set(["admin:access", ...getRouteRequiredPermissions(routePath, "GET", "ui")]))
  const hasPermission = await RBACManager.hasAllPermissions(userId, requiredPermissions)

  if (!hasPermission) {
    redirect("/unauthorized")
  }
}
