import assert from "node:assert/strict"
import test from "node:test"
import { handleGetStream } from "./[id]/stream-route-handler"

test("GET /api/streams/[id] calls getStreamById and returns envelope", async () => {
  const response = await handleGetStream(
    new Request("http://localhost/api/streams/stream_1") as never,
    { id: "stream_1" },
    {
      getSession: async () => ({ user: { id: "user_1" } }),
      getStreamById: async (id) => ({ id, started_at: "2026-02-28T00:00:00.000Z", viewer_count: 10 }),
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(payload.data.stream.id, "stream_1")
  assert.equal(payload.data.stream.started_at, "2026-02-28T00:00:00.000Z")
})
