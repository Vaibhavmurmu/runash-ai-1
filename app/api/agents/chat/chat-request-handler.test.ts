import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCheckoutHandoffContract,
  buildToolPlan,
  resolveRunAshChatToolSelection,
} from "./chat-request-handler.ts"
import { syncCheckoutResultToAccounting } from "@/services/agent-orchestration-service"

test("tool plan splits immediate and queued tools", () => {
  const plan = buildToolPlan(["catalog_lookup", "inventory_health", "checkout_preview", "initiate_link_checkout"])

  assert.deepEqual(plan.immediate, ["catalog_lookup", "initiate_link_checkout"])
  assert.deepEqual(plan.queued, ["inventory_health", "checkout_preview"])
})


test("resolves 'buy this' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("buy this")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("resolves 'confirm purchase' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("confirm purchase")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("resolves 'pay now' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("pay now")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("builds deterministic handoff contract with canonical checkout context", async () => {
  const first = await buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-1",
    authSession: { user: { id: "u1", role: "user", ssoOrganization: 42 } },
    canonical: {
      cartId: "cart-99",
      selectedSku: "SKU-123",
      pricingSnapshot: {
        subtotal: 2499,
        total: 2950,
        currency: "USD",
      },
      billingProfile: {
        country: "US",
        state: "CA",
      },
      productSelection: {
        itemName: "Noise Cancelling Headphones",
        amount: 2950,
      },
      merchant_id: "merchant-legacy",
      product_metadata: {
        legacy_flag: true,
      },
      idempotency_key: "idem-legacy-1",
    },
  })

  assert.equal(first.merchant_id, "merchant-legacy")
  assert.equal(first.merchant_entity_id, "org-42")
  assert.equal(first.amount, 2950)
  assert.equal(first.currency, "USD")
  assert.equal(first.idempotency_key, "idem-legacy-1")
  assert.equal(first.product_metadata.sku, "SKU-123")
  assert.equal(first.product_metadata.context_version, "v2")
  assert.equal(first.product_metadata.cart_id, "cart-99")
  assert.equal(first.product_metadata.legacy_flag, true)
  assert.equal(first.chat_context.context_version, "v2")
  assert.equal(first.chat_context.cart_id, "cart-99")
  assert.equal(first.accounting_context.handoff_context_v2.selected_sku, "SKU-123")
  assert.equal(first.accounting_context.fee_breakdown.amount > 0, true)
  assert.equal(first.accounting_context.tax_breakdown.amount > 0, true)
})

test("keeps explicit tool requests for backward compatibility", () => {
  const tools = resolveRunAshChatToolSelection("confirm", ["web_search"])
  assert.deepEqual(tools, ["web_search"])
})


test("buy this flow triggers accounting sync for successful checkout", async () => {
  const handoff = await buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-accounting-1",
    merchantId: "merchant-1",
  })

  const calls: Array<Record<string, unknown>> = []
  const syncResult = await syncCheckoutResultToAccounting({
    payload: handoff,
    result: {
      status: "initiated",
      checkout_session_id: "cs_123",
      request_id: "req_123",
      idempotency_key: handoff.idempotency_key,
    },
    correlationId: "corr-1",
    postAccountingEventFn: async (input) => {
      calls.push(input.event)
      return {
        posted: true,
        duplicate: false,
        postingId: "post_1",
        event: input.event,
        coa: [],
      }
    },
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].eventType, "payment_succeeded")
  assert.equal(syncResult.status, "posted")
  assert.equal(syncResult.idempotencyKey, `${handoff.idempotency_key}:accounting:payment_succeeded`)
})

test("buy this flow triggers accounting sync for refund scenario with stable idempotency key", async () => {
  const handoff = await buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-accounting-2",
    merchantId: "merchant-2",
  })

  const calls: Array<Record<string, unknown>> = []
  const postAccountingEventFn = async (input: { event: Record<string, unknown> }) => {
    calls.push(input.event)
    return {
      posted: calls.length === 1,
      duplicate: calls.length > 1,
      postingId: "post_2",
      event: input.event,
      coa: [],
    }
  }

  const first = await syncCheckoutResultToAccounting({
    payload: {
      ...handoff,
      payment_status: "refund",
    },
    result: {
      status: "refund",
      checkout_session_id: "cs_ref_1",
      request_id: "req_ref_1",
      idempotency_key: handoff.idempotency_key,
    },
    correlationId: "corr-refund",
    postAccountingEventFn,
  })

  const second = await syncCheckoutResultToAccounting({
    payload: {
      ...handoff,
      payment_status: "refund",
    },
    result: {
      status: "refund",
      checkout_session_id: "cs_ref_1",
      request_id: "req_ref_1",
      idempotency_key: handoff.idempotency_key,
    },
    correlationId: "corr-refund",
    postAccountingEventFn,
  })

  assert.equal(calls.length, 2)
  assert.equal(calls[0].eventType, "refund")
  assert.equal(first.idempotencyKey, second.idempotencyKey)
  assert.equal(second.status, "duplicate")
})
