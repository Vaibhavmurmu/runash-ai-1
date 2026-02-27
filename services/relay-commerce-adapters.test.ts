import assert from "node:assert/strict"
import test from "node:test"

import {
  brokerDealMatchAdapter,
  buyerProductSearchAdapter,
  sellerOptimizationAdapter,
} from "@/services/relay-commerce-adapters"

test("buyerProductSearchAdapter returns structured preference payload", async () => {
  const result = await buyerProductSearchAdapter({
    query: "find sustainable skincare under $30",
    user_currency: "USD",
    max_results: 3,
  })

  assert.equal(typeof result.preferences.currency, "string")
  assert.equal(Array.isArray(result.results), true)
})

test("sellerOptimizationAdapter returns pricing, inventory and bundles", async () => {
  const result = await sellerOptimizationAdapter({ merchant_id: "merchant-1" })
  assert.equal(Array.isArray(result.pricing_recommendations), true)
  assert.equal(Array.isArray(result.inventory_risk_insights), true)
  assert.equal(Array.isArray(result.bundle_promotions), true)
})

test("brokerDealMatchAdapter returns negotiation states and settlement recommendation", async () => {
  const result = await brokerDealMatchAdapter({
    demand_query: "need organic wellness products under 5000",
    currency: "INR",
    max_results: 2,
  })

  assert.equal(Array.isArray(result.recommendations), true)
  if (result.recommendations.length > 0) {
    assert.equal(typeof result.recommendations[0].negotiation_state, "string")
    assert.equal(typeof result.recommendations[0].settlement_recommendation.suggested_price_minor, "number")
  }
})
