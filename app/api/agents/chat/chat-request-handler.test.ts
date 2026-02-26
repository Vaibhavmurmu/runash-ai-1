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

test("builds deterministic handoff contract with idempotency key per intent", () => {
  const first = buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-1",
    merchantId: "merchant-1",
  })
  const second = buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-1",
    merchantId: "merchant-1",
  })

  assert.equal(first.idempotency_key, second.idempotency_key)
  assert.equal(first.product_metadata.sku, second.product_metadata.sku)
  assert.equal(first.chat_context.session_id, "session-1")
  assert.equal(first.chat_context.user_intent, "buy this")
})

test("keeps explicit tool requests for backward compatibility", () => {
  const tools = resolveRunAshChatToolSelection("confirm", ["web_search"])
  assert.deepEqual(tools, ["web_search"])
})


test("buy this flow triggers accounting sync for successful checkout", async () => {
  const handoff = buildCheckoutHandoffContract({
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
  const handoff = buildCheckoutHandoffContract({
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
