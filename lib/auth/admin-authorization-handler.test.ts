import assert from "node:assert/strict"
import test from "node:test"

import { resolveRequiredAdminPermissions } from "./admin-authorization-handler.ts"

test("admin users list requires admin access and users:read", () => {
  const permissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/users",
    method: "GET",
  })

  assert.ok(permissions.includes("admin:access"))
  assert.ok(permissions.includes("users:read"))
})

test("admin users CRUD methods map to write/delete RBAC permissions", () => {
  const createPermissions = resolveRequiredAdminPermissions({ pathname: "/api/admin/users", method: "POST" })
  const updatePermissions = resolveRequiredAdminPermissions({ pathname: "/api/admin/users/42", method: "PUT" })
  const deletePermissions = resolveRequiredAdminPermissions({ pathname: "/api/admin/users/42", method: "DELETE" })

  assert.ok(createPermissions.includes("users:write"))
  assert.ok(updatePermissions.includes("users:write"))
  assert.ok(deletePermissions.includes("users:delete"))
})

test("explicit permissions are merged without duplicates", () => {
  const permissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/users",
    method: "GET",
    explicitPermissions: ["users:read", "users:read", "admin:analytics"],
  })

  const readCount = permissions.filter((permission) => permission === "users:read").length

  assert.equal(readCount, 1)
  assert.ok(permissions.includes("admin:analytics"))
})
