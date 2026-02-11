import assert from "node:assert/strict"
import test from "node:test"

import { handleGetSessionMessages } from "./[id]/get-session-messages-handler.ts"

test("GET /api/messages/session/:id happy path returns frontend contract fields", async () => {
  let capturedSessionId = ""
  let capturedLimit: number | undefined

  const response = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/s-1?limit=2"), { id: "s-1" }, {
    listSessionMessages: (sessionId, limit) => {
      capturedSessionId = sessionId
      capturedLimit = limit
      return [
        {
          id: "m-1",
          session_id: "s-1",
          role: "assistant",
          content: "Welcome",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ]
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(capturedSessionId, "s-1")
  assert.equal(capturedLimit, 2)
  assert.equal(payload.data[0].id, "m-1")
  assert.equal(payload.data[0].content, "Welcome")
  assert.equal(payload.data[0].role, "assistant")
  assert.equal(payload.data[0].created_at, "2025-01-01T00:00:00.000Z")
})

test("GET /api/messages/session/:id empty state returns success with []", async () => {
  const response = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/s-empty"), { id: "s-empty" }, {
    listSessionMessages: () => [],
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.deepEqual(payload.data, [])
})

test("GET /api/messages/session/:id rejects malformed query params and missing id", async () => {
  const missingIdResponse = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/"), { id: "   " }, {
    listSessionMessages: () => [],
  })
  const missingIdPayload = await missingIdResponse.json()

  assert.equal(missingIdResponse.status, 400)
  assert.equal(missingIdPayload.error.code, "SESSION_ID_REQUIRED")

  const malformedLimitResponse = await handleGetSessionMessages(
    new Request("http://localhost/api/messages/session/s-1?limit=0"),
    { id: "s-1" },
    {
      listSessionMessages: () => [],
    },
  )
  const malformedLimitPayload = await malformedLimitResponse.json()

  assert.equal(malformedLimitResponse.status, 400)
  assert.equal(malformedLimitPayload.error.code, "INVALID_LIMIT")
})
