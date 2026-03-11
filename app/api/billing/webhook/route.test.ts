import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"

import { handleStripeWebhookRequest, getRequiredStripeSecretKey } from "@/app/api/billing/webhook/_shared"
import { shouldTreatDuplicateAsProcessed } from "@/lib/services/billing-webhook-idempotency"

function withEnv(vars: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    if (typeof value === "undefined") {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

test("webhook idempotency helper only short-circuits processed duplicates", () => {
  assert.equal(shouldTreatDuplicateAsProcessed("processed"), true)
  assert.equal(shouldTreatDuplicateAsProcessed("processing"), false)
  assert.equal(shouldTreatDuplicateAsProcessed("failed"), false)
  assert.equal(shouldTreatDuplicateAsProcessed(undefined), false)
})

test("webhook shared helper requires Stripe secret key", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
    },
    () => {
      assert.throws(() => getRequiredStripeSecretKey(), /Stripe secret key is not configured/)
    },
  )
})

test("webhook handler returns 500 when Stripe secret key is missing", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    },
    async () => {
      const request = new NextRequest("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": "corr-webhook-1",
        },
        body: JSON.stringify({ id: "evt_test", type: "checkout.session.completed" }),
      })

      const response = await handleStripeWebhookRequest(request)
      assert.equal(response.status, 500)
      assert.deepEqual(await response.json(), { error: "Stripe secret key is not configured" })
    },
  )
})
