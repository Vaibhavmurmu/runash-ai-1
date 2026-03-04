import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"
import { handleStreamsGet, handleStreamsPost } from "./streams-route-handler"

function asSuccessResponse(_req: NextRequest, data: Record<string, unknown>, options: { requestId?: string } = {}) {
  return Response.json({ success: true, data, error: null, requestId: options.requestId ?? null }, { status: 200 })
}

function asErrorResponse(
  _req: NextRequest,
  error: { code: string; message: string },
  options: { status?: number; requestId?: string } = {},
) {
  return Response.json({ success: false, data: null, error, requestId: options.requestId ?? null }, { status: options.status ?? 500 })
}

test("GET /api/streams returns envelope data.streams for authenticated seller", async () => {
  const request = new NextRequest("http://localhost/api/streams")

  const response = await handleStreamsGet(request, {
    getSession: async () => ({ user: { id: "seller-7" } }) as never,
    database: {
      createStream: async () => {
        throw new Error("not used")
      },
      getUserStreams: async (userId: string) => {
        assert.equal(userId, "seller-7")
        return [
          {
            id: "stream-1",
            title: "Morning Harvest",
            description: "Fresh greens",
            status: "scheduled",
            platform: "runash",
            stream_key: "sk_123",
            viewer_count: 3,
            created_at: new Date("2026-01-01T09:00:00.000Z"),
          },
        ]
      },
      updateStream: async () => {
        throw new Error("not used")
      },
    },
    respondOk: asSuccessResponse as never,
    respondErr: asErrorResponse as never,
    logEvent: () => undefined as never,
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(Array.isArray(payload.data.streams), true)
  assert.equal(payload.data.streams[0].id, "stream-1")
})

test("POST /api/streams accepts seller UI scheduling payload and persists scheduled_for", async () => {
  const request = new NextRequest("http://localhost/api/streams", {
    method: "POST",
    body: JSON.stringify({
      title: "Evening Produce Tour",
      description: "Local produce and Q&A",
      category: "vegetables",
      platform: "runash",
      scheduled_for: "2026-03-01T14:30:00.000Z",
    }),
    headers: { "content-type": "application/json" },
  })

  let capturedCreateInput: Record<string, unknown> | null = null

  const response = await handleStreamsPost(request, {
    getSession: async () => ({ user: { id: "seller-17" } }) as never,
    database: {
      createStream: async (input: Record<string, unknown>) => {
        capturedCreateInput = input
        return {
          id: "stream-2",
          ...input,
          created_at: new Date("2026-02-01T00:00:00.000Z"),
        } as never
      },
      getUserStreams: async () => [],
      updateStream: async () => {
        throw new Error("not used")
      },
    },
    respondOk: asSuccessResponse as never,
    respondErr: asErrorResponse as never,
    logEvent: () => undefined as never,
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(payload.data.stream.status, "scheduled")
  assert.equal(capturedCreateInput?.title, "Evening Produce Tour")
  assert.equal(capturedCreateInput?.platform, "runash")
  assert.ok(capturedCreateInput?.started_at instanceof Date)
})

test("POST /api/streams validates scheduled_for", async () => {
  const request = new NextRequest("http://localhost/api/streams", {
    method: "POST",
    body: JSON.stringify({
      title: "Broken payload",
      description: "Invalid schedule",
      category: "general",
      platform: "runash",
      scheduled_for: "not-a-date",
    }),
    headers: { "content-type": "application/json" },
  })

  const response = await handleStreamsPost(request, {
    getSession: async () => ({ user: { id: "seller-17" } }) as never,
    database: {
      createStream: async () => {
        throw new Error("should not run")
      },
      getUserStreams: async () => [],
      updateStream: async () => {
        throw new Error("not used")
      },
    },
    respondOk: asSuccessResponse as never,
    respondErr: asErrorResponse as never,
    logEvent: () => undefined as never,
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.error.code, "VALIDATION_FAILED")
})
