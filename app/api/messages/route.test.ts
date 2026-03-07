import assert from "node:assert/strict"
import test from "node:test"

import { handleCreateMessage } from "./messages-route-handler.ts"

test("POST /api/messages enforces ownership when user identity cannot access session", async () => {
  const response = await handleCreateMessage(
    new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s-2", role: "user", content: "hello" }),
    }),
    {
      getUserId: async () => "",
      isSessionOwnedByUser: async () => false,
      createSessionMessage: async () => ({ id: "", session_id: "", role: "user", content: "" }),
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 403)
  assert.equal(payload.error.code, "SESSION_ACCESS_DENIED")
})

test("POST /api/messages enforces ownership on cross-user session writes", async () => {
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
  assert.equal(response.status, 403)
  assert.equal(payload.error.code, "SESSION_ACCESS_DENIED")
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
