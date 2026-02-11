import assert from "node:assert/strict"
import test from "node:test"

import { handleGetChat } from "./get-chat-handler.ts"

type MockMessage = {
  id: string
  streamId: string
  userId: string
  username: string
  message: string
  timestamp: Date
  platform: string
  type: "message"
  metadata: Record<string, unknown>
}

const BASE_REQUEST_URL = "http://localhost/api/chat"


function asErrorResponse(error: { code: string; message: string }, options: { status: number }) {
  return Response.json({ success: false, data: null, error }, { status: options.status })
}

function asSuccessResponse(data: Record<string, unknown>) {
  return Response.json({ success: true, data, error: null }, { status: 200 })
}

test("GET /api/chat unauthorized access returns 401", async () => {
  const response = await handleGetChat(new Request(`${BASE_REQUEST_URL}?streamId=stream-1`) as any, {
    getSessionUserId: async () => null,
    getChatMessages: async () => [],
    respondError: asErrorResponse,
    respondSuccess: asSuccessResponse,
  })

  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "UNAUTHORIZED")
})

test("GET /api/chat pagination forwards limit/offset and returns pagination metadata", async () => {
  const messages: MockMessage[] = [
    {
      id: "m-1",
      streamId: "stream-7",
      userId: "user-42",
      username: "owner",
      message: "Latest",
      timestamp: new Date("2025-01-01T00:00:00.000Z"),
      platform: "runash",
      type: "message",
      metadata: {},
    },
    {
      id: "m-2",
      streamId: "stream-7",
      userId: "user-42",
      username: "owner",
      message: "Older",
      timestamp: new Date("2024-12-31T00:00:00.000Z"),
      platform: "runash",
      type: "message",
      metadata: {},
    },
  ]

  let capturedQuery: Record<string, unknown> | null = null
  const response = await handleGetChat(
    new Request(`${BASE_REQUEST_URL}?streamId=stream-7&limit=2&offset=4&cursor=2024-12-31T00:00:00.000Z`) as any,
    {
      getSessionUserId: async () => "user-42",
      getChatMessages: async (query) => {
        capturedQuery = query as unknown as Record<string, unknown>
        return messages as any
      },
      respondError: asErrorResponse,
      respondSuccess: asSuccessResponse,
    },
  )

  const payload = await response.json()

  assert.deepEqual(capturedQuery, {
    streamId: "stream-7",
    userId: "user-42",
    limit: 2,
    offset: 4,
    cursor: "2024-12-31T00:00:00.000Z",
  })
  assert.equal(response.status, 200)
  assert.equal(payload.data.pagination.limit, 2)
  assert.equal(payload.data.pagination.offset, 4)
  assert.equal(payload.data.pagination.nextOffset, 6)
  assert.equal(payload.data.pagination.hasMore, true)
})

test("GET /api/chat rejects malformed query params and missing stream id", async () => {
  const missingStreamResponse = await handleGetChat(new Request(`${BASE_REQUEST_URL}?limit=4&offset=0`) as any, {
    getSessionUserId: async () => "user-1",
    getChatMessages: async () => [],
    respondError: asErrorResponse,
    respondSuccess: asSuccessResponse,
  })

  const missingStreamPayload = await missingStreamResponse.json()
  assert.equal(missingStreamResponse.status, 400)
  assert.equal(missingStreamPayload.error.code, "STREAM_ID_REQUIRED")

  const malformedPaginationResponse = await handleGetChat(
    new Request(`${BASE_REQUEST_URL}?streamId=stream-1&limit=abc&offset=-1`) as any,
    {
      getSessionUserId: async () => "user-1",
      getChatMessages: async () => [],
      respondError: asErrorResponse,
      respondSuccess: asSuccessResponse,
    },
  )

  const malformedPaginationPayload = await malformedPaginationResponse.json()
  assert.equal(malformedPaginationResponse.status, 400)
  assert.equal(malformedPaginationPayload.error.code, "INVALID_PAGINATION")
})
