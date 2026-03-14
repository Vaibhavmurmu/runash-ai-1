import assert from "node:assert/strict"
import test from "node:test"

import {
  fetchChatHistory,
  mergeChatMessageSources,
  sendChatMessageRequest,
  type ChatMessage,
} from "@/lib/hooks/use-chat"

type MockResponseInit = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function createResponse(init: MockResponseInit): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: init.json,
  } as Response
}

test("fetchChatHistory returns normalized messages on success", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), "/api/streams/42/chat?limit=100")

    return createResponse({
      ok: true,
      status: 200,
      json: async () => ({
        messages: [
          {
            id: "m1",
            stream_id: "42",
            user_id: "u1",
            username: "alice",
            message: "hello",
            message_type: "message",
            amount: 10,
            created_at: "2026-03-12T10:00:00.000Z",
          },
        ],
      }),
    })
  }) as typeof fetch

  try {
    const messages = await fetchChatHistory("42")
    assert.deepEqual(messages, [
      {
        id: "m1",
        stream_id: "42",
        user_id: "u1",
        username: "alice",
        message: "hello",
        message_type: "message",
        amount: 10,
        created_at: "2026-03-12T10:00:00.000Z",
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("fetchChatHistory throws on non-2xx", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    createResponse({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as typeof fetch

  try {
    await assert.rejects(() => fetchChatHistory("42"), /CHAT_FETCH_FAILED_500/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("sendChatMessageRequest returns created message on success", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "/api/streams/42/chat")
    assert.equal(init?.method, "POST")

    const payload = JSON.parse(String(init?.body)) as { message?: string; type?: string; metadata?: { amount?: number } }
    assert.deepEqual(payload, {
      message: "new message",
      type: "tip",
      metadata: {
        amount: 50,
      },
    })

    return createResponse({
      ok: true,
      status: 200,
      json: async () => ({
        message: {
          id: "m2",
          stream_id: "42",
          user_id: "u2",
          username: "bob",
          message: "new message",
          message_type: "tip",
          amount: 50,
          created_at: "2026-03-12T10:01:00.000Z",
        },
      }),
    })
  }) as typeof fetch

  try {
    const result = await sendChatMessageRequest("42", {
      message: "new message",
      message_type: "tip",
      amount: 50,
    })

    assert.equal(result.error, null)
    assert.deepEqual(result.data, {
      id: "m2",
      stream_id: "42",
      user_id: "u2",
      username: "bob",
      message: "new message",
      message_type: "tip",
      amount: 50,
      created_at: "2026-03-12T10:01:00.000Z",
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("sendChatMessageRequest returns typed errors on failure", async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = (async () =>
      createResponse({
        ok: false,
        status: 400,
        json: async () => ({ error: "Message is required" }),
      })) as typeof fetch
    const badRequest = await sendChatMessageRequest("42", { message: "" })
    assert.deepEqual(badRequest, { data: null, error: "CHAT_SEND_BAD_REQUEST" })

    globalThis.fetch = (async () => {
      throw new Error("offline")
    }) as typeof fetch
    const network = await sendChatMessageRequest("42", { message: "hi" })
    assert.deepEqual(network, { data: null, error: "CHAT_SEND_NETWORK_ERROR" })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("mergeChatMessageSources dedupes by id and prefers newest copy deterministically", () => {
  const history: ChatMessage[] = [
    {
      id: "m1",
      stream_id: "42",
      user_id: "u1",
      username: "alice",
      message: "older",
      message_type: "message",
      amount: null,
      created_at: "2026-03-12T10:00:00.000Z",
    },
    {
      id: "m2",
      stream_id: "42",
      user_id: "u2",
      username: "bob",
      message: "history item",
      message_type: "message",
      amount: null,
      created_at: "2026-03-12T10:01:00.000Z",
    },
  ]

  const realtime: ChatMessage[] = [
    {
      id: "m1",
      stream_id: "42",
      user_id: "u1",
      username: "alice",
      message: "newer from realtime",
      message_type: "message",
      amount: null,
      created_at: "2026-03-12T10:02:00.000Z",
    },
    {
      id: "m3",
      stream_id: "42",
      user_id: "u3",
      username: "carol",
      message: "realtime item",
      message_type: "message",
      amount: null,
      created_at: "2026-03-12T10:01:30.000Z",
    },
  ]

  const merged = mergeChatMessageSources(history, realtime)
  assert.deepEqual(
    merged.map((message) => `${message.id}:${message.message}`),
    ["m2:history item", "m3:realtime item", "m1:newer from realtime"],
  )
})
