import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

function buildRequest(url: string, method: "GET" | "POST") {
  return new NextRequest(url, {
    method,
    headers: {
      "x-request-id": "req_stream_sessions_authz",
      "content-type": "application/json",
    },
  })
}

async function loadHandlers() {
  process.env.DATABASE_URL ??= "postgres://local:local@127.0.0.1:5432/local"

  const [{ handleStartSession }, { handleEndSession }, { handleGetSessionRecordings, handleCreateSessionRecording }] =
    await Promise.all([
      import("./[id]/start/route"),
      import("./[id]/end/route"),
      import("./[id]/recordings/route"),
    ])

  return { handleStartSession, handleEndSession, handleGetSessionRecordings, handleCreateSessionRecording }
}

test("start session rejects unauthorized actors", async () => {
  const { handleStartSession } = await loadHandlers()

  const response = await handleStartSession(buildRequest("http://localhost/api/streams/sessions/stream_1/start", "POST"), { id: "stream_1" }, {
    getSession: async () => null,
    getStream: async () => null,
    updateStream: async () => {
      throw new Error("unexpected update")
    },
  })

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    success: false,
    data: null,
    error: { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" },
    requestId: "req_stream_sessions_authz",
  })
})

test("start session rejects cross-tenant actors", async () => {
  const { handleStartSession } = await loadHandlers()

  const response = await handleStartSession(buildRequest("http://localhost/api/streams/sessions/stream_1/start", "POST"), { id: "stream_1" }, {
    getSession: async () => ({ user: { id: "tenant_b" } }) as never,
    getStream: async () => ({ id: "stream_1", user_id: "tenant_a" }) as never,
    updateStream: async () => {
      throw new Error("unexpected update")
    },
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    success: false,
    data: null,
    error: { code: "FORBIDDEN", message: "Forbidden" },
    requestId: "req_stream_sessions_authz",
  })
})

test("end session rejects unauthorized actors", async () => {
  const { handleEndSession } = await loadHandlers()

  const response = await handleEndSession(buildRequest("http://localhost/api/streams/sessions/stream_1/end", "POST"), { id: "stream_1" }, {
    getSession: async () => null,
    getStream: async () => null,
    updateStream: async () => {
      throw new Error("unexpected update")
    },
  })

  assert.equal(response.status, 401)
  const payload = await response.json()
  assert.equal(payload.error.code, "AUTH_UNAUTHORIZED")
})

test("recordings GET rejects cross-tenant actors", async () => {
  const { handleGetSessionRecordings } = await loadHandlers()

  const response = await handleGetSessionRecordings(buildRequest("http://localhost/api/streams/sessions/stream_1/recordings", "GET"), { id: "stream_1" }, {
    getSession: async () => ({ user: { id: "tenant_b" } }) as never,
    getStream: async () => ({ id: "stream_1", user_id: "tenant_a" }) as never,
    getRecordings: async () => [],
    createRecording: async () => {
      throw new Error("unexpected create")
    },
  })

  assert.equal(response.status, 403)
  const payload = await response.json()
  assert.equal(payload.error.code, "FORBIDDEN")
})

test("recordings POST rejects unauthorized actors", async () => {
  const { handleCreateSessionRecording } = await loadHandlers()

  const request = new NextRequest("http://localhost/api/streams/sessions/stream_1/recordings", {
    method: "POST",
    headers: {
      "x-request-id": "req_stream_sessions_authz",
      "content-type": "application/json",
    },
    body: JSON.stringify({ durationSeconds: 100 }),
  })

  const response = await handleCreateSessionRecording(request, { id: "stream_1" }, {
    getSession: async () => null,
    getStream: async () => null,
    getRecordings: async () => [],
    createRecording: async () => {
      throw new Error("unexpected create")
    },
  })

  assert.equal(response.status, 401)
  const payload = await response.json()
  assert.equal(payload.error.code, "AUTH_UNAUTHORIZED")
})
