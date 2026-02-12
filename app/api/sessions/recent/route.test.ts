import assert from "node:assert/strict"
import test from "node:test"

import { handleGetRecentSession } from "./get-recent-session-handler.ts"

test("GET /api/sessions/recent returns latest session in happy path", async () => {
  const response = await handleGetRecentSession(new Request("http://localhost/api/sessions/recent"), {
    getMostRecentSession: async () => ({
      id: "s-100",
      title: "Latest",
      created_at: "2025-01-10T00:00:00.000Z",
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(typeof payload.requestId, "string")
  assert.equal(payload.data.id, "s-100")
})

test("GET /api/sessions/recent empty state returns 404", async () => {
  const response = await handleGetRecentSession(new Request("http://localhost/api/sessions/recent"), {
    getMostRecentSession: async () => null,
  })

  const payload = await response.json()

  assert.equal(response.status, 404)
  assert.equal(payload.success, false)
  assert.equal(typeof payload.requestId, "string")
  assert.equal(payload.error.code, "SESSION_NOT_FOUND")
})
