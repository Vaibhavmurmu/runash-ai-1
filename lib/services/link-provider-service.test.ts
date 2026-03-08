import assert from "node:assert/strict"
import test from "node:test"

import {
  createLinkProviderSession,
  fetchLinkVerificationFromProvider,
  LinkProviderError,
  saveLinkPaymentMethodViaProvider,
} from "@/lib/services/link-provider-service"

function withEnv(vars: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    if (typeof value === "undefined") {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

test("Link provider session throws provider unavailable when Stripe is not configured outside development mock", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      NODE_ENV: "production",
      LINK_PROVIDER_ENABLE_MOCK: "false",
    },
    async () => {
      await assert.rejects(
        createLinkProviderSession({ email: "user@example.com", requestId: "req-1" }),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE",
      )

      await assert.rejects(
        fetchLinkVerificationFromProvider("seti_123"),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE",
      )

      await assert.rejects(
        saveLinkPaymentMethodViaProvider({
          email: "user@example.com",
          holderName: "RunAsh User",
          cardNumber: "4242424242424242",
          expMonth: 12,
          expYear: 2030,
          requestId: "req-2",
        }),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE",
      )
    },
  )
})

test("Link provider development mock remains available only when dedicated flag is enabled", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      NODE_ENV: "development",
      LINK_PROVIDER_ENABLE_MOCK: "true",
    },
    async () => {
      const session = await createLinkProviderSession({ email: "dev@example.com", requestId: "req-dev" })
      assert.match(session.providerSessionId, /^lps_/)

      const verification = await fetchLinkVerificationFromProvider("seti_dev")
      assert.equal(verification.status, "pending")
      assert.match(verification.providerRequestId ?? "", /^mock_req_/)

      const saved = await saveLinkPaymentMethodViaProvider({
        email: "dev@example.com",
        holderName: "Dev User",
        cardNumber: "4111 1111 1111 1111",
        expMonth: 10,
        expYear: 2031,
        requestId: "req-dev-save",
      })

      assert.match(saved.providerPaymentMethodId, /^pm_mock_/)
      assert.equal(saved.last4, "1111")
    },
  )
})
