import { getRouteRequiredPermissions } from "../rbac.ts"

export type AdminAuthorizationInput = {
  pathname: string
  method: string
  basePermissions?: readonly string[]
  explicitPermissions?: readonly string[]
}

export function resolveRequiredAdminPermissions(input: AdminAuthorizationInput): string[] {
  const routePermissions = getRouteRequiredPermissions(input.pathname, input.method, "api")

  if (input.pathname.startsWith("/api/admin") && routePermissions.length === 0 && !(input.explicitPermissions?.length)) {
    throw new Error(`Missing permission policy mapping for admin route: ${input.method.toUpperCase()} ${input.pathname}`)
  }

  return Array.from(
    new Set([
      ...(input.basePermissions ?? ["admin:access"]),
      ...routePermissions,
      ...(input.explicitPermissions ?? []),
    ]),
  )
}
