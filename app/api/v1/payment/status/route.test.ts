import assert from "node:assert/strict"
import test from "node:test"

import { mapResolvedStatusToRouteState } from "@/lib/payments/payment-status-mappers"

test("status page mapping resolves complete/error/incomplete/pending states", () => {
  assert.equal(mapResolvedStatusToRouteState("complete"), "complete")
  assert.equal(mapResolvedStatusToRouteState("error"), "error")
  assert.equal(mapResolvedStatusToRouteState("incomplete"), "incomplete")
  assert.equal(mapResolvedStatusToRouteState("pending"), "pending")
})
