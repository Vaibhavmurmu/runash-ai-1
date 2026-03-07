import assert from "node:assert/strict"
import test from "node:test"

test("GET /api/sessions/:id/messages returns invalid request for malformed cursor", async (t) => {
  t.mock.module("@/lib/auth/session", {
    namedExports: {
      getServerAuthSession: async () => ({ user: { id: "user-1" } }),
    },
  })
  t.mock.module("@/lib/repositories/runash-chat", {
    namedExports: {
      isSessionOwnedByUser: async () => true,
      listSessionMessages: async () => [],
    },
  })

  const { GET } = await import("./route")
  const response = await GET(new Request("http://localhost/api/sessions/s-1/messages?cursor=bad!"), { params: { id: "s-1" } })
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.error.code, "INVALID_REQUEST")
})

test("GET /api/sessions/:id/messages uses created_at asc pagination and returns nextCursor", async (t) => {
  let receivedCursor: { createdAt: string; id: string } | null | undefined

  t.mock.module("@/lib/auth/session", {
    namedExports: {
      getServerAuthSession: async () => ({ user: { id: "user-1" } }),
    },
  })
  t.mock.module("@/lib/repositories/runash-chat", {
    namedExports: {
      isSessionOwnedByUser: async () => true,
      listSessionMessages: async (
        _sessionId: string,
        _limit: number,
        _userId: string,
        cursor?: { createdAt: string; id: string } | null,
      ) => {
        receivedCursor = cursor
        return [
          { id: 101, session_id: "s-1", role: "user", content: "a", created_at: "2025-01-01T00:00:00.000Z" },
          { id: 102, session_id: "s-1", role: "assistant", content: "b", created_at: "2025-01-01T00:00:01.000Z" },
        ]
      },
    },
  })

  const { GET } = await import("./route")
  const cursor = Buffer.from(JSON.stringify({ createdAt: "2025-01-01T00:00:00.500Z", id: "100" }), "utf-8").toString("base64url")
  const response = await GET(new Request(`http://localhost/api/sessions/s-1/messages?limit=2&cursor=${cursor}`), { params: { id: "s-1" } })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(receivedCursor?.id, "100")
  assert.equal(payload.data.items[0].id, 101)
  assert.equal(payload.data.items[1].id, 102)
  assert.equal(typeof payload.data.nextCursor, "string")
})
