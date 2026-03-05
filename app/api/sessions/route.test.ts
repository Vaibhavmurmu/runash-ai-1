import assert from "node:assert/strict"
import test from "node:test"

import { handleCreateSession, handleGetSessions } from "./sessions-route-handler.ts"

test("GET /api/sessions returns 401 when unauthorized", async () => {
  const response = await handleGetSessions(new Request("http://localhost/api/sessions"), {
    getUserId: async () => null,
    listSessions: async () => [],
    createSession: async () => ({ id: "", title: "", created_at: "" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "AUTH_REQUIRED")
})

test("GET /api/sessions returns user-scoped sessions", async () => {
  let capturedUserId = ""
  const response = await handleGetSessions(new Request("http://localhost/api/sessions"), {
    getUserId: async () => "user-1",
    listSessions: async (userId) => {
      capturedUserId = userId
      return [{ id: "s-1", title: "Mine", created_at: "2025-01-01T00:00:00.000Z" }]
    },
    createSession: async () => ({ id: "", title: "", created_at: "" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(capturedUserId, "user-1")
  assert.equal(payload.data[0].id, "s-1")
})

test("POST /api/sessions returns 401 when unauthorized", async () => {
  const response = await handleCreateSession(new Request("http://localhost/api/sessions", { method: "POST", body: JSON.stringify({ title: "x" }) }), {
    getUserId: async () => null,
    listSessions: async () => [],
    createSession: async () => ({ id: "", title: "", created_at: "" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "AUTH_REQUIRED")
})

test("POST /api/sessions creates session for authenticated user", async () => {
  let capturedUserId = ""
  let capturedTitle = ""
  const response = await handleCreateSession(new Request("http://localhost/api/sessions", { method: "POST", body: JSON.stringify({ title: "My Session" }) }), {
    getUserId: async () => "user-1",
    listSessions: async () => [],
    createSession: async (title, userId) => {
      capturedUserId = userId
      capturedTitle = title
      return { id: "s-2", title, created_at: "2025-01-01T00:00:00.000Z" }
    },
  })

  const payload = await response.json()
  assert.equal(response.status, 201)
  assert.equal(capturedUserId, "user-1")
  assert.equal(capturedTitle, "My Session")
  assert.equal(payload.data.id, "s-2")
})
