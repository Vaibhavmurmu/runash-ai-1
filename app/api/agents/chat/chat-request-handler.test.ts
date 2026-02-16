import assert from "node:assert/strict"
import test from "node:test"

import { buildToolPlan } from "./chat-request-handler.ts"

test("tool plan splits immediate and queued tools", () => {
  const plan = buildToolPlan(["catalog_lookup", "inventory_health", "checkout_preview", "initiate_link_checkout"])

  assert.deepEqual(plan.immediate, ["catalog_lookup", "initiate_link_checkout"])
  assert.deepEqual(plan.queued, ["inventory_health", "checkout_preview"])
})
