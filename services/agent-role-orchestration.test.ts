import assert from "node:assert/strict"
import test from "node:test"

import { isToolAllowedForRole } from "@/services/agent-role-orchestration"

test("buyer role can run buyer_product_search", () => {
  assert.equal(isToolAllowedForRole("buyer", "buyer_product_search"), true)
})

test("seller role can run seller_optimize_commerce", () => {
  assert.equal(isToolAllowedForRole("seller", "seller_optimize_commerce"), true)
})

test("broker role can run broker_match_deal", () => {
  assert.equal(isToolAllowedForRole("broker", "broker_match_deal"), true)
})
