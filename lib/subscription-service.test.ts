import assert from "node:assert/strict"
import test from "node:test"

import { SubscriptionService } from "./subscription-service.ts"

type MockFetchRequest = {
  method: string
  url: URL
  body?: any
}

const makeJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })

test("subscription lifecycle integration: plans -> create -> change -> cancel/reactivate -> invoices", async () => {
  const service = SubscriptionService.getInstance()

  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "Starter",
      price: 999,
      currency: "USD",
      interval: "month",
      interval_count: 1,
      features: [],
      limits: {
        streams_per_month: 10,
        storage_gb: 5,
        analytics_retention_days: 30,
        multi_platform_streams: 1,
        custom_branding: false,
        priority_support: false,
        api_access: false,
      },
      is_popular: false,
      is_active: true,
      trial_days: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "pro",
      name: "Pro",
      description: "Pro",
      price: 2999,
      currency: "USD",
      interval: "month",
      interval_count: 1,
      features: [],
      limits: {
        streams_per_month: 100,
        storage_gb: 50,
        analytics_retention_days: 90,
        multi_platform_streams: 4,
        custom_branding: true,
        priority_support: true,
        api_access: true,
      },
      is_popular: true,
      is_active: true,
      trial_days: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const state = {
    subscription: {
      id: "sub_1",
      user_id: "user_1",
      plan_id: "starter",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan: plans[0],
    } as any,
  }

  const invoices = [
    {
      id: "inv_1",
      user_id: "user_1",
      amount_due: 999,
      amount_paid: 999,
      currency: "USD",
      status: "paid",
      description: "Starter",
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      line_items: [],
    },
  ]

  const requests: MockFetchRequest[] = []

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = new URL(typeof input === "string" ? input : input.toString(), "http://localhost")
    const method = init?.method ?? "GET"
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    requests.push({ method, url: requestUrl, body })

    if (requestUrl.pathname === "/api/billing/plans" && method === "GET") {
      return makeJsonResponse({ plans })
    }

    if (requestUrl.pathname === "/api/billing/subscription" && method === "POST") {
      state.subscription = { ...state.subscription, plan_id: body.plan_id, plan: plans.find((p) => p.id === body.plan_id) }
      return makeJsonResponse({ subscription: state.subscription })
    }

    if (requestUrl.pathname === "/api/billing/subscription" && method === "PATCH") {
      state.subscription = { ...state.subscription, plan_id: body.plan_id, plan: plans.find((p) => p.id === body.plan_id) }
      return makeJsonResponse({ subscription: state.subscription })
    }

    if (requestUrl.pathname === "/api/billing/subscription/cancel" && method === "POST") {
      state.subscription = { ...state.subscription, cancel_at_period_end: true }
      return makeJsonResponse({ subscription: state.subscription })
    }

    if (requestUrl.pathname === "/api/billing/subscription/reactivate" && method === "POST") {
      state.subscription = { ...state.subscription, cancel_at_period_end: false }
      return makeJsonResponse({ subscription: state.subscription })
    }

    if (requestUrl.pathname === "/api/billing/invoices" && method === "GET") {
      return makeJsonResponse({ invoices, total: invoices.length })
    }

    return makeJsonResponse({ error: "not found" }, 404)
  }) as typeof fetch

  try {
    const fetchedPlans = await service.getPlans()
    assert.equal(fetchedPlans.length, 2)

    const created = await service.createSubscription("starter")
    assert.equal(created.subscription.plan_id, "starter")

    const updated = await service.updateSubscription("pro")
    assert.equal(updated.plan_id, "pro")

    const canceled = await service.cancelSubscription()
    assert.equal(canceled.cancel_at_period_end, true)

    const reactivated = await service.reactivateSubscription()
    assert.equal(reactivated.cancel_at_period_end, false)

    const result = await service.getInvoices(10, 0)
    assert.equal(result.invoices.length, 1)
    assert.equal(result.total, 1)

    const touchedPaths = requests.map((request) => `${request.method} ${request.url.pathname}`)
    assert.deepEqual(touchedPaths, [
      "GET /api/billing/plans",
      "POST /api/billing/subscription",
      "PATCH /api/billing/subscription",
      "POST /api/billing/subscription/cancel",
      "POST /api/billing/subscription/reactivate",
      "GET /api/billing/invoices",
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
