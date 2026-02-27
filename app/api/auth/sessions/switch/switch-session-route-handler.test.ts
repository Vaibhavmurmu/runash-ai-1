import assert from "node:assert/strict"
import test from "node:test"

import { handleSwitchSessionScope } from "./switch-session-route-handler"

test("POST /api/auth/sessions/switch updates session scope", async () => {
  const request = new Request("http://localhost/api/auth/sessions/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_1", scope: "checkout" }),
  })

  let captured: { userId: string; sessionId: string; scope: string } | null = null
  const response = await handleSwitchSessionScope(request, { id: "user_1" }, {
    switchScope: async (userId, sessionId, scope) => {
      captured = { userId, sessionId, scope }
      return { id: sessionId, userId, scope }
    },
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.session.scope, "checkout")
  assert.deepEqual(captured, { userId: "user_1", sessionId: "sess_1", scope: "checkout" })
})

test("POST /api/auth/sessions/switch returns 404 when target session is missing", async () => {
  const request = new Request("http://localhost/api/auth/sessions/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_missing", scope: "checkout" }),
  })

  const response = await handleSwitchSessionScope(request, { id: "user_1" }, { switchScope: async () => null })
  const payload = await response.json()

  assert.equal(response.status, 404)
  assert.equal(payload.message, "Session not found")
})

test("POST /api/auth/sessions/switch returns 400 for invalid payload", async () => {
  const request = new Request("http://localhost/api/auth/sessions/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scope: "checkout" }),
  })

  const response = await handleSwitchSessionScope(request, { id: "user_1" })
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.message, "Invalid request")
})

test("POST /api/auth/sessions/switch returns 401 without authenticated user", async () => {
  const request = new Request("http://localhost/api/auth/sessions/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_1", scope: "checkout" }),
  })

  const response = await handleSwitchSessionScope(request, null)
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.message, "Unauthorized")
})
