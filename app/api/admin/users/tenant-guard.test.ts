import assert from "node:assert/strict"
import test from "node:test"

import { enforceTenantBoundaryForUser } from "@/lib/api/route-auth"

test("tenant guard rejects cross-tenant target user", async () => {
  const result = await enforceTenantBoundaryForUser(12, 4, async () => 7)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 403)
  }
})

test("tenant guard allows same-tenant target user", async () => {
  const result = await enforceTenantBoundaryForUser(12, 4, async () => 4)
  assert.equal(result.ok, true)
})

test("tenant guard returns not found when target user is missing", async () => {
  const result = await enforceTenantBoundaryForUser(12, 4, async () => undefined)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 404)
  }
})
