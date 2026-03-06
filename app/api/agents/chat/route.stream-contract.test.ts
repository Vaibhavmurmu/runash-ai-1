import assert from "node:assert/strict"
import test from "node:test"

import { encodeChatStreamEvent } from "./stream-event-contract"

function decodeSseEvent(payload: string) {
  const [eventLine, dataLine] = payload.trim().split("\n")
  const event = eventLine?.replace(/^event:\s*/, "")
  const dataJson = dataLine?.replace(/^data:\s*/, "")
  return {
    event,
    data: dataJson ? (JSON.parse(dataJson) as Record<string, unknown>) : null,
  }
}

test("chat SSE stream contract encodes token event payload", () => {
  const encoded = encodeChatStreamEvent("token", {
    token: "hello",
    messageId: "msg-1",
    provider: "openai",
    model: "gpt-4o-mini",
    requestId: "req-1",
  })

  const decoded = decodeSseEvent(encoded)
  assert.equal(decoded.event, "token")
  assert.equal(decoded.data?.token, "hello")
  assert.equal(decoded.data?.messageId, "msg-1")
  assert.equal(decoded.data?.provider, "openai")
  assert.equal(decoded.data?.model, "gpt-4o-mini")
  assert.equal(decoded.data?.requestId, "req-1")
})

test("chat SSE stream contract encodes tool_start event payload", () => {
  const encoded = encodeChatStreamEvent("tool_start", {
    tool: "catalog_lookup",
    messageId: "msg-2",
    status: "tool-running",
    executionId: "catalog-1",
    startedAt: "2026-01-01T00:00:00.000Z",
    timeoutMs: 12000,
    retryCount: 1,
  })

  const decoded = decodeSseEvent(encoded)
  assert.equal(decoded.event, "tool_start")
  assert.equal(decoded.data?.tool, "catalog_lookup")
  assert.equal(decoded.data?.executionId, "catalog-1")
  assert.equal(decoded.data?.status, "tool-running")
  assert.equal(decoded.data?.timeoutMs, 12000)
  assert.equal(decoded.data?.retryCount, 1)
})

test("chat SSE stream contract encodes tool_result event payload", () => {
  const encoded = encodeChatStreamEvent("tool_result", {
    tool: "inventory_health",
    executionId: "inventory-1",
    timeoutMs: 12000,
    retryCount: 2,
    result: { ok: true },
    fromCache: false,
    attempts: 1,
  })

  const decoded = decodeSseEvent(encoded)
  assert.equal(decoded.event, "tool_result")
  assert.equal(decoded.data?.tool, "inventory_health")
  assert.deepEqual(decoded.data?.result, { ok: true })
  assert.equal(decoded.data?.executionId, "inventory-1")
  assert.equal(decoded.data?.fromCache, false)
  assert.equal(decoded.data?.attempts, 1)
})

test("chat SSE stream contract encodes final event payload", () => {
  const encoded = encodeChatStreamEvent("final", {
    type: "final",
    status: "completed",
    sessionId: "session-1",
    messageId: "message-1",
    userMessageId: "message-user-1",
    content: "Done",
    provider: "openai",
    model: "gpt-4o-mini",
    requestId: "req-final",
  })

  const decoded = decodeSseEvent(encoded)
  assert.equal(decoded.event, "final")
  assert.equal(decoded.data?.status, "completed")
  assert.equal(decoded.data?.sessionId, "session-1")
  assert.equal(decoded.data?.messageId, "message-1")
  assert.equal(decoded.data?.userMessageId, "message-user-1")
  assert.equal(decoded.data?.content, "Done")
})

test("chat SSE stream contract encodes error event payload", () => {
  const encoded = encodeChatStreamEvent("error", {
    message: "Unable to complete agent turn",
    requestId: "req-err",
    code: "PROVIDER_TIMEOUT",
  })

  const decoded = decodeSseEvent(encoded)
  assert.equal(decoded.event, "error")
  assert.equal(decoded.data?.message, "Unable to complete agent turn")
  assert.equal(decoded.data?.requestId, "req-err")
  assert.equal(decoded.data?.code, "PROVIDER_TIMEOUT")
})
