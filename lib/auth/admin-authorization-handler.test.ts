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
  assert.ok(deletePermissions.includes("users:write"))
  assert.ok(deletePermissions.includes("system:control"))
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

test("admin role-management routes require admin settings permission", () => {
  const listPermissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/roles",
    method: "GET",
  })

  const updatePermissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/roles/12",
    method: "PATCH",
  })

  const deletePermissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/roles/12",
    method: "DELETE",
  })

  assert.ok(listPermissions.includes("admin:settings"))
  assert.ok(updatePermissions.includes("admin:settings"))
  assert.ok(deletePermissions.includes("system:control"))
})

test("session delete requires logs and elevated control", () => {
  const permissions = resolveRequiredAdminPermissions({
    pathname: "/api/admin/sessions/9f09a4ce-7a3c-47fd-9bfa-53413cb89fc0",
    method: "DELETE",
  })

  assert.ok(permissions.includes("system:logs"))
  assert.ok(permissions.includes("system:control"))
})
