import assert from "node:assert/strict"
import test from "node:test"

import { evaluateTenantBoundaryAccess } from "@/lib/api/tenant-guard"

test("admin tenant guard rejects cross-tenant target user", () => {
  const result = evaluateTenantBoundaryAccess(4, 7)
  assert.equal(result.allowed, false)
})

test("admin tenant guard allows same-tenant target user", () => {
  const result = evaluateTenantBoundaryAccess(4, 4)
  assert.equal(result.allowed, true)
})
