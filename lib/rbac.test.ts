import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

import {
  BASELINE_ROLES,
  DEFAULT_ROLES,
  getRouteRequiredPermissions,
  getEffectiveRolePermissions,
  isAssignableAdminRole,
  resolveBaselineRole,
} from "./rbac"

function getAdminRouteFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return getAdminRouteFiles(fullPath)
    }

    return entry.isFile() && entry.name === "route.ts" ? [fullPath] : []
  })
}

test("canonical admin role is assignable for role-management APIs", () => {
  assert.equal(isAssignableAdminRole(BASELINE_ROLES.ADMIN), true)
})

test("legacy roles resolve to canonical baseline capabilities", () => {
  assert.equal(resolveBaselineRole(DEFAULT_ROLES.CUSTOMER_FINANCE), BASELINE_ROLES.OPERATOR)
  assert.equal(resolveBaselineRole(DEFAULT_ROLES.SUPER_ADMIN), BASELINE_ROLES.ADMIN)
})

test("canonical role permission bundles are explicit", () => {
  const viewerPermissions = getEffectiveRolePermissions(BASELINE_ROLES.VIEWER)
  const legacyOperatorPermissions = getEffectiveRolePermissions(DEFAULT_ROLES.CUSTOMER_OPERATOR)
  const legacyFinancePermissions = getEffectiveRolePermissions(DEFAULT_ROLES.CUSTOMER_FINANCE)
  const adminPermissions = getEffectiveRolePermissions(BASELINE_ROLES.ADMIN)

  assert.ok(viewerPermissions.includes("dashboard:read"))
  assert.ok(!viewerPermissions.includes("admin:analytics"))
  assert.ok(!viewerPermissions.includes("admin:settings"))
  assert.ok(legacyOperatorPermissions.includes("operations:restart"))
  assert.ok(!legacyOperatorPermissions.includes("admin:settings"))
  assert.ok(legacyFinancePermissions.includes("payments:refund"))
  assert.ok(legacyFinancePermissions.includes("admin:analytics"))
  assert.ok(adminPermissions.includes("admin:settings"))
  assert.ok(adminPermissions.includes("system:control"))
})

test("legacy admin routes preserve baseline permissions for existing role names", () => {
  const legacyAdminPermissions = getEffectiveRolePermissions(DEFAULT_ROLES.ADMIN)
  const canonicalAdminPermissions = getEffectiveRolePermissions(BASELINE_ROLES.ADMIN)

  assert.deepEqual(legacyAdminPermissions, canonicalAdminPermissions)
  assert.ok(legacyAdminPermissions.includes("users:write"))
  assert.ok(legacyAdminPermissions.includes("system:control"))
})

test("all protected admin API endpoints resolve explicit route permissions", () => {
  const routeFiles = getAdminRouteFiles(path.join(process.cwd(), "app", "api", "admin"))

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8")
    const methodMatches = source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)
    const routePath = `/${path
      .relative(path.join(process.cwd(), "app"), path.dirname(routeFile))
      .split(path.sep)
      .join("/")}`

    for (const match of methodMatches) {
      const requiredPermissions = getRouteRequiredPermissions(routePath, match[1], "api")
      assert.ok(requiredPermissions.length > 0, `Expected explicit permission mapping for ${match[1]} ${routePath}`)
    }
  }
})


test("admin authorization resolver denies unmapped admin route policies", async () => {
  const { resolveRequiredAdminPermissions } = await import("./auth/admin-authorization-handler.ts")

  assert.throws(() =>
    resolveRequiredAdminPermissions({
      pathname: "/api/admin/unmapped-endpoint",
      method: "GET",
      explicitPermissions: [],
    }),
  )
})
