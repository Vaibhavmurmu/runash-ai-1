import assert from "node:assert/strict"
import test from "node:test"

import { evaluateTenantBoundaryAccess } from "./tenant-guard"

test("tenant guard allows same-tenant access", () => {
  const result = evaluateTenantBoundaryAccess(12, 12)
  assert.equal(result.allowed, true)
  assert.equal(result.shouldMigrateLegacyOrganization, false)
})

test("tenant guard blocks cross-tenant access", () => {
  const result = evaluateTenantBoundaryAccess(12, 98)
  assert.equal(result.allowed, false)
  assert.equal(result.shouldMigrateLegacyOrganization, false)
})

test("tenant guard allows legacy null rows and flags migration", () => {
  const result = evaluateTenantBoundaryAccess(12, null)
  assert.equal(result.allowed, true)
  assert.equal(result.shouldMigrateLegacyOrganization, true)
})
