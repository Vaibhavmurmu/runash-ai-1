import assert from "node:assert/strict"
import test from "node:test"

import { handleGetSessionMessages } from "./[id]/get-session-messages-handler.ts"

test("GET /api/messages/session/:id returns 401 for unauthorized access", async () => {
  const response = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/s-1?limit=2"), { id: "s-1" }, {
    getUserId: async () => null,
    isSessionOwnedByUser: async () => true,
    listSessionMessages: async () => [],
  })

  const payload = await response.json()
  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "AUTH_REQUIRED")
})

test("GET /api/messages/session/:id denies cross-user access", async () => {
  const response = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/s-2?limit=2"), { id: "s-2" }, {
    getUserId: async () => "user-1",
    isSessionOwnedByUser: async () => false,
    listSessionMessages: async () => [],
  })

  const payload = await response.json()
  assert.equal(response.status, 404)
  assert.equal(payload.error.code, "SESSION_NOT_FOUND")
})

test("GET /api/messages/session/:id happy path returns frontend contract fields", async () => {
  let capturedSessionId = ""
  let capturedLimit: number | undefined

  const response = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/s-1?limit=2"), { id: "s-1" }, {
    getUserId: async () => "user-1",
    isSessionOwnedByUser: async () => true,
    listSessionMessages: async (sessionId, limit) => {
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
  assert.equal(typeof payload.requestId, "string")
  assert.equal(capturedSessionId, "s-1")
  assert.equal(capturedLimit, 2)
  assert.equal(payload.data[0].id, "m-1")
  assert.equal(payload.data[0].content, "Welcome")
  assert.equal(payload.data[0].role, "assistant")
  assert.equal(payload.data[0].created_at, "2025-01-01T00:00:00.000Z")
})

test("GET /api/messages/session/:id rejects malformed query params and missing id", async () => {
  const missingIdResponse = await handleGetSessionMessages(new Request("http://localhost/api/messages/session/"), { id: "   " }, {
    getUserId: async () => "user-1",
    isSessionOwnedByUser: async () => true,
    listSessionMessages: async () => [],
  })
  const missingIdPayload = await missingIdResponse.json()

  assert.equal(missingIdResponse.status, 400)
  assert.equal(typeof missingIdPayload.requestId, "string")
  assert.equal(missingIdPayload.error.code, "SESSION_ID_REQUIRED")

  const malformedLimitResponse = await handleGetSessionMessages(
    new Request("http://localhost/api/messages/session/s-1?limit=0"),
    { id: "s-1" },
    {
      getUserId: async () => "user-1",
      isSessionOwnedByUser: async () => true,
      listSessionMessages: async () => [],
    },
  )
  const malformedLimitPayload = await malformedLimitResponse.json()

  assert.equal(malformedLimitResponse.status, 400)
  assert.equal(typeof malformedLimitPayload.requestId, "string")
  assert.equal(malformedLimitPayload.error.code, "INVALID_LIMIT")
})
