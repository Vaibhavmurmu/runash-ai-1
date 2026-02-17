import assert from "node:assert/strict"
import test from "node:test"

import {
  BASELINE_ROLES,
  DEFAULT_ROLES,
  getEffectiveRolePermissions,
  isAssignableAdminRole,
  resolveBaselineRole,
} from "./rbac"

test("canonical admin role is assignable for role-management APIs", () => {
  assert.equal(isAssignableAdminRole(BASELINE_ROLES.ADMIN), true)
})

test("legacy roles resolve to canonical baseline capabilities", () => {
  assert.equal(resolveBaselineRole(DEFAULT_ROLES.CUSTOMER_FINANCE), BASELINE_ROLES.OPERATOR)
  assert.equal(resolveBaselineRole(DEFAULT_ROLES.SUPER_ADMIN), BASELINE_ROLES.ADMIN)
})

test("canonical role permission bundles are explicit", () => {
  const viewerPermissions = getEffectiveRolePermissions(BASELINE_ROLES.VIEWER)
  const adminPermissions = getEffectiveRolePermissions(BASELINE_ROLES.ADMIN)

  assert.ok(viewerPermissions.includes("admin:analytics"))
  assert.ok(!viewerPermissions.includes("admin:settings"))
  assert.ok(adminPermissions.includes("admin:settings"))
  assert.ok(adminPermissions.includes("system:control"))
})
