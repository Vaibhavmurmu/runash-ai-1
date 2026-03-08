import assert from "node:assert/strict"
import test, { mock } from "node:test"

import { NextRequest } from "next/server"

test("POST /api/checkout/session resolves with redirect and checkout session fields", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_mock"

  mock.module("@/lib/billing-auth", {
    namedExports: {
      requireScopedBillingAccess: async () => ({
        sessionUser: {
          userId: "user-1",
          email: "user@example.com",
          organizationId: "org-1",
        },
      }),
      getAuthorizedBillingIdentity: async () => ({
        user: {
          stripe_customer_id: "cus_123",
        },
      }),
    },
  })

  mock.module("@/lib/audit-logging", {
    namedExports: {
      logPrivilegedAction: async () => {},
    },
  })

  mock.module("@/lib/payments/checkout-return-state", {
    namedExports: {
      createSignedCheckoutReturnState: () => "signed-state",
    },
  })

  mock.module("@/lib/payments/logging-sanitizer", {
    namedExports: {
      sanitizePaymentActivityDetails: (value: unknown) => value,
    },
  })

  mock.module("@/lib/payments/edge-routing-policy", {
    namedExports: {
      buildComplianceSafePaymentMetadata: ({ metadata }: { metadata: Record<string, string> }) => metadata,
      createPaymentRoutingAuditEvent: () => ({ requestId: "req-1", routeDecision: "default" }),
      createPaymentRoutingContextMetadata: () => ({ requestId: "req-1" }),
      resolveEdgeRoutingPolicy: () => "default",
      withRouteContextMetadata: (metadata: Record<string, string>) => metadata,
    },
  })

  mock.module("@/lib/payments/validator-gate", {
    namedExports: {
      enforcePaymentValidatorMiddleware: () => ({
        allowed: true,
        decision: { allowed: true },
      }),
    },
  })

  mock.module("@/lib/services/tax-service", {
    namedExports: {
      computeTaxForRegion: async () => ({
        countryCode: "US",
        stateCode: "CA",
        taxableAmount: 10,
        totalTaxAmount: 1,
        totalAmount: 11,
        jurisdictionDetails: [],
        lineItems: [],
      }),
      persistTaxComputation: async () => {},
    },
  })

  mock.module("@/services/payment-checkout-profile-service", {
    namedExports: {
      upsertCustomerCheckoutProfile: async () => {},
    },
  })

  mock.module("@/lib/services/runashbook-accounting-service", {
    namedExports: {
      postAccountingEvent: async () => {},
    },
  })

  mock.module("stripe", {
    defaultExport: class Stripe {
      prices = {
        retrieve: async () => ({
          unit_amount: 1000,
          currency: "usd",
        }),
      }

      checkout = {
        sessions: {
          create: async () => ({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          }),
        },
      }
    },
  })

  const { POST } = await import("./route")

  const response = await POST(
    new NextRequest("http://localhost/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        priceId: "price_test_123",
        mode: "payment",
        success_url: "http://localhost/payment-redirect/return",
        cancel_url: "http://localhost/payment-redirect/return?status=failed",
      }),
      headers: { "content-type": "application/json" },
    }),
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(typeof payload.data.redirectUrl, "string")
  assert.equal(typeof payload.data.url, "string")
  assert.equal(payload.data.checkoutSessionId, "cs_test_123")
  assert.equal(payload.data.provider, "stripe")
  assert.equal(payload.data.providerTransactionReference, "cs_test_123")
})
