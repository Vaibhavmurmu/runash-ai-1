import test from "node:test"
import assert from "node:assert/strict"
import { createSignedCheckoutReturnState, verifySignedCheckoutReturnState } from "@/lib/payments/checkout-return-state"

test("createSignedCheckoutReturnState and verifySignedCheckoutReturnState roundtrip", () => {
  const token = createSignedCheckoutReturnState({
    checkoutSessionId: "cs_test_123",
    customerId: "cust_1",
    providerTransactionReference: "cs_test_123",
    ttlSeconds: 120,
  })

  const verified = verifySignedCheckoutReturnState(token)
  assert.equal(verified.ok, true)
  if (!verified.ok) return

  assert.equal(verified.payload.checkoutSessionId, "cs_test_123")
  assert.equal(verified.payload.customerId, "cust_1")
  assert.equal(verified.payload.providerTransactionReference, "cs_test_123")
})

test("verifySignedCheckoutReturnState rejects malformed state", () => {
  const verified = verifySignedCheckoutReturnState("not-a-token")
  assert.equal(verified.ok, false)
})
