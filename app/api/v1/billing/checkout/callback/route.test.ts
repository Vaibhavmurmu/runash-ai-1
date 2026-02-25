import assert from "node:assert/strict"
import test from "node:test"

import { mapResolutionToFinalStatus } from "@/lib/payments/checkout-callback-mappers"

test("checkout redirect roundtrip maps resolved statuses to callback statuses", () => {
  assert.equal(mapResolutionToFinalStatus("complete"), "completed")
  assert.equal(mapResolutionToFinalStatus("error"), "failed")
  assert.equal(mapResolutionToFinalStatus("incomplete"), "expired")
  assert.equal(mapResolutionToFinalStatus("pending"), "pending")
})
