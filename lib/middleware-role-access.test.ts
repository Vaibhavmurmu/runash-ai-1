import assert from "node:assert/strict"
import test from "node:test"

import { evaluateRoleAccess, resolveAuthDecision, resolveRouteAccessRequirement } from "../middleware"

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

test("seller dashboard routes enforce seller-capable roles", () => {
  const requirement = resolveRouteAccessRequirement("/seller/dashboard")

  assert.equal(requirement.requiresSession, true)
  assert.deepEqual(requirement.requiredRoles, ["seller", "admin", "super_admin"])

  assert.equal(evaluateRoleAccess("/seller/dashboard", { isAuthenticated: true, role: "user" }).status, "forbidden")
  assert.equal(evaluateRoleAccess("/seller/dashboard", { isAuthenticated: true, role: "seller" }).status, "allowed")
})

test("seller studio dashboard route rejects non-seller roles", () => {
  const requirement = resolveRouteAccessRequirement("/dashboard/seller-studio")

  assert.equal(requirement.requiresSession, true)
  assert.deepEqual(requirement.requiredRoles, ["seller", "admin", "super_admin"])

  assert.equal(evaluateRoleAccess("/dashboard/seller-studio", { isAuthenticated: true, role: "user" }).status, "forbidden")
  assert.equal(evaluateRoleAccess("/dashboard/seller-studio", { isAuthenticated: true, role: "seller" }).status, "allowed")
})

test("ecommerce admin routes enforce admin-capable roles", () => {
  const requirement = resolveRouteAccessRequirement("/ecommerce/admin")

  assert.equal(requirement.requiresSession, true)
  assert.deepEqual(requirement.requiredRoles, ["admin", "super_admin"])

  assert.equal(evaluateRoleAccess("/ecommerce/admin", { isAuthenticated: true, role: "seller" }).status, "forbidden")
  assert.equal(evaluateRoleAccess("/ecommerce/admin", { isAuthenticated: true, role: "super_admin" }).status, "allowed")
})

test("protected user routes require an authenticated session", () => {
  assert.equal(evaluateRoleAccess("/dashboard", { isAuthenticated: false, role: null }).status, "unauthorized")
  assert.equal(evaluateRoleAccess("/dashboard", { isAuthenticated: true, role: "user" }).status, "allowed")
})

test("admin and seller APIs distinguish unauthorized and forbidden outcomes", () => {
  assert.equal(evaluateRoleAccess("/api/admin/users", { isAuthenticated: false, role: null }).status, "unauthorized")
  assert.equal(evaluateRoleAccess("/api/admin/users", { isAuthenticated: true, role: "seller" }).status, "forbidden")

  assert.equal(evaluateRoleAccess("/api/seller/settings", { isAuthenticated: false, role: null }).status, "unauthorized")
  assert.equal(evaluateRoleAccess("/api/seller/settings", { isAuthenticated: true, role: "user" }).status, "forbidden")
})

test("privileged chat and live routes are no longer treated as public", () => {
  assert.equal(resolveAuthDecision("/chat").requiresSessionValidation, true)
  assert.equal(resolveAuthDecision("/runash-chat").requiresSessionValidation, true)
  assert.equal(resolveAuthDecision("/live").requiresSessionValidation, true)
})


test("auth permission and claims APIs require authenticated sessions", () => {
  assert.equal(resolveAuthDecision("/api/auth/permissions").requiresSessionValidation, true)
  assert.equal(resolveAuthDecision("/api/auth/claims").requiresSessionValidation, true)
  assert.equal(resolveAuthDecision("/api/auth/get-session").requiresSessionValidation, false)
})
