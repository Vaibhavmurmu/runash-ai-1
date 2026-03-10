import assert from "node:assert/strict"
import test from "node:test"

import {
  createStreamSession,
  endStreamSession,
  getSessionPlatformState,
  startStreamSession,
  updateSessionPlatformState,
} from "@/lib/stream-session-contract"

test("session bootstrap creates a stream session", async () => {
  const originalFetch = global.fetch
  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      assert.equal(String(input), "/api/streams/sessions")
      return new Response(JSON.stringify({ session: { id: "sess_1", status: "scheduled" } }), { status: 200 })
    }) as typeof fetch

    const created = await createStreamSession({ title: "Studio" })
    assert.equal(created.session.id, "sess_1")
    assert.equal(created.session.status, "scheduled")
  } finally {
    global.fetch = originalFetch
  }
})

test("session lifecycle start and end call canonical endpoints", async () => {
  const originalFetch = global.fetch
  const calls: string[] = []
  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response(JSON.stringify({ session: { id: "sess_2", status: "live" } }), { status: 200 })
    }) as typeof fetch

    await startStreamSession("sess_2")
    await endStreamSession("sess_2")
    assert.deepEqual(calls, ["/api/streams/sessions/sess_2/start", "/api/streams/sessions/sess_2/end"])
  } finally {
    global.fetch = originalFetch
  }
})

test("platform status hydration reads session-scoped state", async () => {
  const originalFetch = global.fetch
  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/platforms") && init?.method === "PUT") {
        return new Response(JSON.stringify({ sessionId: "sess_3", selectedPlatformIds: ["yt_1"], platforms: [] }), {
          status: 200,
        })
      }
      return new Response(
        JSON.stringify({
          sessionId: "sess_3",
          selectedPlatformIds: ["tw_1", "yt_1"],
          platforms: [
            { id: "tw_1", name: "Twitch", platform_type: "twitch", is_connected: true, connection_status: "connected" },
          ],
        }),
        { status: 200 },
      )
    }) as typeof fetch

    const hydrated = await getSessionPlatformState("sess_3")
    assert.deepEqual(hydrated.selectedPlatformIds, ["tw_1", "yt_1"])

    const updated = await updateSessionPlatformState("sess_3", ["yt_1"])
    assert.deepEqual(updated.selectedPlatformIds, ["yt_1"])
  } finally {
    global.fetch = originalFetch
  }
})

test("unauthorized responses bubble up as contract errors", async () => {
  const originalFetch = global.fetch
  try {
    global.fetch = (async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })) as typeof fetch

    await assert.rejects(() => getSessionPlatformState("sess_unauthorized"), /Unauthorized/)
  } finally {
    global.fetch = originalFetch
  }
})
