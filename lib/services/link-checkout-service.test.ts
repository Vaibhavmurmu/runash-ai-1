import test from "node:test"
import assert from "node:assert/strict"

import { runLinkCheckoutWithFallback } from "@/lib/services/link-checkout-service"

test("Link checkout retries backup method on retryable primary failure and returns fallback metadata", async () => {
  let call = 0

  const result = await runLinkCheckoutWithFallback(
    {
      merchant_id: "merchant_1",
      amount: 1200,
      currency: "INR",
      product_metadata: {
        item_name: "RunAsh Pro Plan",
        sku: "runash-pro",
        tags: ["via RunAshChat"],
      },
      default_payment_method: "stripe_link",
      backup_payment_method: "upi_collect",
    },
    {
      requestId: "req-1",
      fetchImpl: async () => {
        call += 1

        if (call === 1) {
          return new Response(JSON.stringify({ error_code: "timeout" }), {
            status: 504,
            headers: { "Content-Type": "application/json" },
          })
        }

        return new Response(JSON.stringify({ checkout_session_id: "sess-2", provider_status: "initiated" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      },
      persistAttemptFn: async () => undefined,
    },
  )

  assert.equal(result.status, "initiated")
  assert.equal(result.fallbackUsed, true)
  assert.deepEqual(result.attemptedMethods, ["stripe_link", "upi_collect"])
  assert.equal(result.attempts.length, 2)
  assert.equal(result.attempts[0]?.reason, "primary")
  assert.equal(result.attempts[1]?.reason, "fallback_retry")
})

test("Link checkout does not retry backup method on non-retryable primary failure", async () => {
  const result = await runLinkCheckoutWithFallback(
    {
      merchant_id: "merchant_2",
      amount: 900,
      currency: "USD",
      product_metadata: {
        item_name: "RunAsh Credits",
        sku: "credits",
        tags: ["via RunAshChat"],
      },
      default_payment_method: "stripe_link",
      backup_payment_method: "card_backup",
    },
    {
      requestId: "req-2",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error_code: "invalid_request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      persistAttemptFn: async () => undefined,
    },
  )

  assert.equal(result.status, "failed")
  assert.equal(result.fallbackUsed, false)
  assert.deepEqual(result.attemptedMethods, ["stripe_link"])
  assert.equal(result.attempts.length, 1)
  assert.equal(result.attempts[0]?.reason, "primary")
})
