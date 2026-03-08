import assert from "node:assert/strict"
import test from "node:test"

import {
  createLinkProviderSession,
  fetchLinkVerificationFromProvider,
  LinkProviderError,
  saveLinkPaymentMethodViaProvider,
  toUserSafeProviderError,
} from "@/lib/services/link-provider-service"

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

test("Link provider operations throw provider unavailable when Stripe is not configured", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      NODE_ENV: "production",
      LINK_PROVIDER_ENABLE_MOCK: "false",
      LINK_PROVIDER_MOCK_FAIL_OP: undefined,
    },
    async () => {
      await assert.rejects(
        createLinkProviderSession({ email: "user@example.com", requestId: "req-1" }),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE" && error.status === 503,
      )

      await assert.rejects(
        fetchLinkVerificationFromProvider("seti_123"),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE" && error.status === 503,
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
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE" && error.status === 503,
      )
    },
  )
})

test("test-only mock is blocked outside test env", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: "sk_test_123",
      NODE_ENV: "production",
      LINK_PROVIDER_ENABLE_MOCK: "true",
    },
    async () => {
      await assert.rejects(
        createLinkProviderSession({ email: "user@example.com", requestId: "req-3" }),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_PROVIDER_UNAVAILABLE",
      )
    },
  )
})

test("test-only mock supports successful Stripe Link session creation for tests", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      NODE_ENV: "test",
      LINK_PROVIDER_ENABLE_MOCK: "true",
      LINK_PROVIDER_MOCK_FAIL_OP: undefined,
    },
    async () => {
      const session = await createLinkProviderSession({ email: "user@example.com", requestId: "req-4", userId: "user-1" })
      assert.deepEqual(session, {
        provider: "stripe_link",
        providerSessionId: "seti_mock_123",
        providerCustomerId: "cus_mock_123",
        maskedPhone: "*** *** 3421",
        providerRequestId: "req_mock_setup_intent",
      })
    },
  )
})

test("provider operation errors are typed when Stripe call fails", async () => {
  await withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_KEY: undefined,
      NODE_ENV: "test",
      LINK_PROVIDER_ENABLE_MOCK: "true",
      LINK_PROVIDER_MOCK_FAIL_OP: "session",
    },
    async () => {
      await assert.rejects(
        createLinkProviderSession({ email: "user@example.com", requestId: "req-5" }),
        (error: unknown) => error instanceof LinkProviderError && error.code === "LINK_SESSION_FAILED" && error.status === 502,
      )
    },
  )
})

test("Provider errors map to user-safe message and preserve typed code", () => {
  const mappedKnown = toUserSafeProviderError(new LinkProviderError("LINK_SAVE_FAILED", "internal details", 502, "req_provider"))
  assert.deepEqual(mappedKnown, {
    code: "LINK_SAVE_FAILED",
    message: "Unable to save payment details right now. Please try again.",
    providerRequestId: "req_provider",
    status: 502,
    retryable: true,
  })

  const mappedUnknown = toUserSafeProviderError(new Error("unexpected provider stack and card context"))
  assert.deepEqual(mappedUnknown, {
    code: "LINK_PROVIDER_UNAVAILABLE",
    message: "Payment provider is currently unavailable. Please try again shortly.",
    providerRequestId: null,
    status: 503,
    retryable: true,
  })
})
