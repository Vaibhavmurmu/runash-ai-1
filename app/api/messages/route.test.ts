import assert from "node:assert/strict"
import test from "node:test"

import { handleCreateMessage } from "./messages-route-handler.ts"

test("POST /api/messages returns 401 when unauthorized", async () => {
  const response = await handleCreateMessage(new Request("http://localhost/api/messages", { method: "POST", body: JSON.stringify({}) }), {
    getUserId: async () => null,
    isSessionOwnedByUser: async () => false,
    createSessionMessage: async () => ({ id: "", session_id: "", role: "user", content: "" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "AUTH_REQUIRED")
})

test("POST /api/messages denies cross-user session writes", async () => {
  const response = await handleCreateMessage(
    new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s-2", role: "user", content: "hello" }),
    }),
    {
      getUserId: async () => "user-1",
      isSessionOwnedByUser: async () => false,
      createSessionMessage: async () => ({ id: "", session_id: "", role: "user", content: "" }),
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 404)
  assert.equal(payload.error.code, "SESSION_NOT_FOUND")
})

test("POST /api/messages creates message for owned session", async () => {
  let capturedSessionId = ""
  const response = await handleCreateMessage(
    new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s-1", role: "assistant", content: "ok", messageType: "tip" }),
    }),
    {
      getUserId: async () => "user-1",
      isSessionOwnedByUser: async () => true,
      createSessionMessage: async (sessionId, role, content, messageType) => {
        capturedSessionId = sessionId
        return { id: "m-1", session_id: sessionId, role, content, message_type: messageType }
      },
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 201)
  assert.equal(capturedSessionId, "s-1")
  assert.equal(payload.data.id, "m-1")
})
