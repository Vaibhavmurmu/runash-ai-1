import assert from "node:assert/strict"
import test from "node:test"

type GetRoutePermissions = typeof import("./rbac.ts").getRouteRequiredPermissions

async function loadGetRouteRequiredPermissions(): Promise<GetRoutePermissions> {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test"
  const module = await import("./rbac.ts")
  return module.getRouteRequiredPermissions
}

test("RBAC API route rules enforce method-sensitive admin permissions", async () => {
  const getRouteRequiredPermissions = await loadGetRouteRequiredPermissions()
  const readPermissions = getRouteRequiredPermissions("/api/admin/permissions", "GET", "api")
  const deletePermissions = getRouteRequiredPermissions("/api/admin/permissions/abc", "DELETE", "api")

  assert.deepEqual(readPermissions, ["admin:settings"])
  assert.deepEqual(deletePermissions, ["admin:settings", "system:control"])
})

test("RBAC session endpoints enforce elevated control for destructive actions", async () => {
  const getRouteRequiredPermissions = await loadGetRouteRequiredPermissions()
  const patchPermissions = getRouteRequiredPermissions("/api/admin/sessions/123", "PATCH", "api")
  const deletePermissions = getRouteRequiredPermissions("/api/admin/sessions/123", "DELETE", "api")

  assert.deepEqual(patchPermissions, ["system:logs"])
  assert.deepEqual(deletePermissions, ["system:logs", "system:control"])
})

test("RBAC UI route rules enforce admin page-specific permissions", async () => {
  const getRouteRequiredPermissions = await loadGetRouteRequiredPermissions()
  const performancePermissions = getRouteRequiredPermissions("/admin/performance", "GET", "ui")
  const emailManagementPermissions = getRouteRequiredPermissions("/admin/email-management", "GET", "ui")
  const ecommerceAdminPermissions = getRouteRequiredPermissions("/ecommerce/admin", "GET", "ui")

  assert.deepEqual(performancePermissions, ["admin:analytics"])
  assert.deepEqual(emailManagementPermissions, ["admin:settings"])
  assert.deepEqual(ecommerceAdminPermissions, ["admin:analytics"])
})
