import assert from "node:assert/strict"
import test from "node:test"

import { handleListSessions, handleRevokeSessions } from "./sessions-route-handler"

test("GET /api/auth/sessions lists concurrent active sessions", async () => {
  const response = await handleListSessions(
    { id: "user_1" },
    {
      listSessions: async () => [
        {
          id: "sess_a",
          userId: "user_1",
          mode: "cookie",
          scope: "default",
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          linkedFromSessionId: null,
          deviceId: "dev_mac",
          deviceName: "Mac",
          userAgent: "test",
        },
        {
          id: "sess_b",
          userId: "user_1",
          mode: "bearer",
          scope: "api",
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          linkedFromSessionId: null,
          deviceId: "dev_phone",
          deviceName: "iPhone",
          userAgent: "test",
        },
      ],
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.concurrentSessionCount, 2)
  assert.equal(payload.sessions[0].id, "sess_a")
  assert.equal(payload.sessions[1].id, "sess_b")
})

test("GET /api/auth/sessions returns 401 without authenticated user", async () => {
  const response = await handleListSessions(null)
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.message, "Unauthorized")
})

test("DELETE /api/auth/sessions revokes one session", async () => {
  const input = new Request("http://localhost/api/auth/sessions", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_1" }),
  })

  let captured: { sessionId?: string; userId?: string; reason: string } | null = null
  const response = await handleRevokeSessions(input, { id: "user_1" }, { invalidate: async (options) => void (captured = options) })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.revoked, true)
  assert.equal(payload.revokedAll, false)
  assert.deepEqual(captured, { sessionId: "sess_1", reason: "user_requested_revoke_single" })
})

test("DELETE /api/auth/sessions revokes all sessions for user", async () => {
  const input = new Request("http://localhost/api/auth/sessions", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ revokeAll: true }),
  })

  let captured: { sessionId?: string; userId?: string; reason: string } | null = null
  const response = await handleRevokeSessions(input, { id: "user_1" }, { invalidate: async (options) => void (captured = options) })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.revokedAll, true)
  assert.deepEqual(captured, { userId: "user_1", reason: "user_requested_revoke_all" })
})

test("DELETE /api/auth/sessions returns 400 for invalid payload", async () => {
  const input = new Request("http://localhost/api/auth/sessions", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  })

  const response = await handleRevokeSessions(input, { id: "user_1" })
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.message, "Invalid request")
})

test("DELETE /api/auth/sessions returns 401 without authenticated user", async () => {
  const input = new Request("http://localhost/api/auth/sessions", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_1" }),
  })

  const response = await handleRevokeSessions(input, null)
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.message, "Unauthorized")
})
