import assert from "node:assert/strict"
import test from "node:test"

import { shouldTreatDuplicateAsProcessed } from "@/lib/services/billing-webhook-idempotency"

test("webhook idempotency helper only short-circuits processed duplicates", () => {
  assert.equal(shouldTreatDuplicateAsProcessed("processed"), true)
  assert.equal(shouldTreatDuplicateAsProcessed("processing"), false)
  assert.equal(shouldTreatDuplicateAsProcessed("failed"), false)
  assert.equal(shouldTreatDuplicateAsProcessed(undefined), false)
})
