import { getRouteRequiredPermissions } from "../rbac.ts"

export type AdminAuthorizationInput = {
  pathname: string
  method: string
  basePermissions?: readonly string[]
  explicitPermissions?: readonly string[]
}

export function resolveRequiredAdminPermissions(input: AdminAuthorizationInput): string[] {
  return Array.from(
    new Set([
      ...(input.basePermissions ?? ["admin:access"]),
      ...getRouteRequiredPermissions(input.pathname, input.method, "api"),
      ...(input.explicitPermissions ?? []),
    ]),
  )
}
