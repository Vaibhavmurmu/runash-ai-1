import assert from "node:assert/strict"
import test from "node:test"

import { CheckoutSubmissionError, submitCheckoutOrder } from "./checkout-submission-service"

const baseOrder = {
  customer: {
    email: "buyer@example.com",
    firstName: "Buyer",
    lastName: "One",
    address: "1 Main St",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
  },
  payment: {
    method: "card" as const,
    cardNumber: "**** **** **** 4242",
    nameOnCard: "Buyer One",
  },
  items: [
    {
      product_id: "prod_1",
      name: "Coffee",
      quantity: 1,
      price: 19.99,
      product: {
        id: "prod_1",
        stripePriceId: "price_123",
      },
    },
  ],
  totals: {
    total: 19.99,
  },
}

test("submitCheckoutOrder returns order + payment metadata on happy path", async () => {
  const attempts: Array<Record<string, unknown>> = []
  const statuses: string[] = []
  const calls: Array<{ url: string; method: string }> = []

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    calls.push({ url, method })

    if (url.endsWith("/api/orders")) {
      return new Response(JSON.stringify({ id: 42, status: "pending", total: 19.99, row_version: 1 }), { status: 201 })
    }

    if (url.endsWith("/api/checkout/session")) {
      return new Response(
        JSON.stringify({
          data: {
            provider: "stripe",
            checkoutSessionId: "cs_123",
            providerTransactionReference: "cs_123",
            redirectUrl: "https://checkout.stripe.com/c/pay/cs_123",
          },
        }),
        { status: 200 },
      )
    }

    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 })
  }

  const result = await submitCheckoutOrder(
    {
      order: baseOrder,
      customerId: "1001",
      origin: "http://localhost:3000",
    },
    {
      fetchImpl,
      createCheckoutLinkFn: async () => ({ id: "link_1" } as any),
      createCheckoutSessionRecordFn: async () => ({ id: "chk_sess_1" } as any),
      recordCheckoutAttemptResultFn: async (input) => {
        attempts.push(input)
        return {} as any
      },
      updateCheckoutSessionStatusFn: async ({ status }) => {
        statuses.push(status)
        return {} as any
      },
    },
  )

  assert.equal(result.order.id, 42)
  assert.equal(result.payment.checkoutSessionId, "cs_123")
  assert.equal(result.payment.redirectUrl, "https://checkout.stripe.com/c/pay/cs_123")
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    "POST http://localhost:3000/api/orders",
    "POST http://localhost:3000/api/checkout/session",
  ])
  assert.equal(attempts.length, 1)
  assert.equal(attempts[0]?.attemptStatus, "authorized")
  assert.deepEqual(statuses, ["authorized"])
})

test("submitCheckoutOrder rejects invalid payload when no Stripe price id is available", async () => {
  await assert.rejects(
    submitCheckoutOrder(
      {
        order: {
          ...baseOrder,
          items: baseOrder.items.map((item) => ({ ...item, product: { id: "prod_1" } })),
        },
        customerId: "1001",
        origin: "http://localhost:3000",
      },
      {
        fetchImpl: async () => new Response(JSON.stringify({ id: 88, status: "pending", total: 19.99, row_version: 1 }), { status: 201 }),
        createCheckoutLinkFn: async () => ({ id: "link_2" } as any),
        createCheckoutSessionRecordFn: async () => ({ id: "chk_sess_2" } as any),
        recordCheckoutAttemptResultFn: async () => ({} as any),
        updateCheckoutSessionStatusFn: async () => ({} as any),
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof CheckoutSubmissionError)
      assert.equal(error.code, "CHECKOUT_PRICE_ID_REQUIRED")
      return true
    },
  )
})

test("submitCheckoutOrder records failure and rolls order back when checkout session creation fails", async () => {
  const attempts: Array<Record<string, unknown>> = []
  const statuses: string[] = []
  const calls: Array<{ url: string; method: string }> = []

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, method: init?.method ?? "GET" })

    if (url.endsWith("/api/orders")) {
      return new Response(JSON.stringify({ id: 77, status: "pending", total: 19.99, row_version: 1 }), { status: 201 })
    }

    if (url.endsWith("/api/checkout/session")) {
      return new Response(JSON.stringify({ error: "stripe unavailable" }), { status: 502 })
    }

    if (url.endsWith("/api/orders/77")) {
      return new Response(JSON.stringify({ id: 77, status: "failed" }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 })
  }

  await assert.rejects(
    submitCheckoutOrder(
      {
        order: baseOrder,
        customerId: "1002",
        origin: "http://localhost:3000",
      },
      {
        fetchImpl,
        createCheckoutLinkFn: async () => ({ id: "link_3" } as any),
        createCheckoutSessionRecordFn: async () => ({ id: "chk_sess_3" } as any),
        recordCheckoutAttemptResultFn: async (input) => {
          attempts.push(input)
          return {} as any
        },
        updateCheckoutSessionStatusFn: async ({ status }) => {
          statuses.push(status)
          return {} as any
        },
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof CheckoutSubmissionError)
      assert.equal(error.code, "PAYMENT_SESSION_FAILED")
      return true
    },
  )

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    "POST http://localhost:3000/api/orders",
    "POST http://localhost:3000/api/checkout/session",
    "PUT http://localhost:3000/api/orders/77",
  ])
  assert.equal(attempts[0]?.attemptStatus, "failed")
  assert.deepEqual(statuses, ["failed"])
})
