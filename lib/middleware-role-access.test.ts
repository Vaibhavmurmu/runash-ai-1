import assert from "node:assert/strict"
import test from "node:test"

import { evaluateRoleAccess, resolveRouteAccessRequirement } from "../middleware"

test("admin prefixes require an admin-capable role", () => {
  const requirement = resolveRouteAccessRequirement("/api/admin/users")

  assert.equal(requirement.requiresSession, true)
  assert.deepEqual(requirement.requiredRoles, ["admin", "super_admin"])

  assert.equal(evaluateRoleAccess("/api/admin/users", { isAuthenticated: true, role: "user" }).status, "forbidden")
  assert.equal(evaluateRoleAccess("/api/admin/users", { isAuthenticated: true, role: "admin" }).status, "allowed")
})

test("seller prefixes reject non-seller sessions", () => {
  assert.equal(evaluateRoleAccess("/api/seller/settings", { isAuthenticated: true, role: "user" }).status, "forbidden")
  assert.equal(evaluateRoleAccess("/api/seller/settings", { isAuthenticated: true, role: "seller" }).status, "allowed")
})

test("protected user routes require an authenticated session", () => {
  assert.equal(evaluateRoleAccess("/dashboard", { isAuthenticated: false, role: null }).status, "unauthorized")
  assert.equal(evaluateRoleAccess("/dashboard", { isAuthenticated: true, role: "user" }).status, "allowed")
})

