import assert from "node:assert/strict"
import test from "node:test"

import { buildToolPlan } from "./chat-request-handler.ts"

test("tool plan splits immediate and queued tools", () => {
  const plan = buildToolPlan(["catalog_lookup", "inventory_health", "checkout_preview"])

  assert.deepEqual(plan.immediate, ["catalog_lookup"])
  assert.deepEqual(plan.queued, ["inventory_health", "checkout_preview"])
})
