import assert from "node:assert/strict"
import test from "node:test"
import {
  createLiveStreamProvider,
  LiveStreamProviderError,
  mapLiveStreamProviderError,
  type ProvisionLiveStreamInput,
} from "@/services/live-stream/provider"

const baseInput: ProvisionLiveStreamInput = {
  sessionId: "session_123",
  ownerUserId: 42,
  workspaceId: "workspace_1",
  dvrEnabled: true,
  latencyProfile: "normal",
}

test("createLiveStreamProvider selects mock only in explicit local/dev mode", async () => {
  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "mock",
      RUNASH_LIVE_STREAM_ENABLE_MOCK: "1",
      NODE_ENV: "development",
    },
  })

  const result = await provider.provision(baseInput)
  assert.equal(result.provider, "runash-mock-live")
  assert.equal(result.providerSessionId, `mock_${baseInput.sessionId}`)
})

test("createLiveStreamProvider rejects mock provider in production", () => {
  assert.throws(
    () =>
      createLiveStreamProvider({
        env: {
          RUNASH_LIVE_STREAM_PROVIDER: "mock",
          RUNASH_LIVE_STREAM_ENABLE_MOCK: "1",
          NODE_ENV: "production",
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof LiveStreamProviderError)
      assert.equal(error.code, "PROVIDER_CONFIGURATION_ERROR")
      return true
    },
  )
})

test("mux adapter provisions and stops successfully", async () => {
  const calls: string[] = []
  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "mux",
      MUX_TOKEN_ID: "token-id",
      MUX_TOKEN_SECRET: "token-secret",
      NODE_ENV: "production",
    },
    fetchImpl: async (url, init) => {
      calls.push(`${String(init?.method ?? "POST")}:${String(url)}`)
      if (String(url).endsWith("/complete")) {
        return new Response(JSON.stringify({ data: { status: "completed" } }), { status: 200 })
      }

      return new Response(
        JSON.stringify({
          data: {
            id: "mux_live_id",
            stream_key: "mux_stream_key",
            playback_ids: [{ id: "playback_123", policy: "public" }],
          },
        }),
        { status: 200 },
      )
    },
  })

  const provisioned = await provider.provision(baseInput)
  assert.equal(provisioned.provider, "mux")
  assert.equal(provisioned.providerSessionId, "mux_live_id")
  assert.equal(provisioned.playbackUrls[0]?.url, "https://stream.mux.com/playback_123.m3u8")

  await provider.stop({ sessionId: baseInput.sessionId, providerSessionId: provisioned.providerSessionId })
  assert.equal(calls.length, 2)
  assert.match(calls[1] ?? "", /\/complete$/)
})

test("provider failure mapping normalizes provider errors", async () => {
  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "mux",
      MUX_TOKEN_ID: "token-id",
      MUX_TOKEN_SECRET: "token-secret",
      NODE_ENV: "production",
      RUNASH_LIVE_STREAM_PROVIDER_RETRY_COUNT: "0",
    },
    fetchImpl: async () => new Response(JSON.stringify({ error: { type: "internal_error" } }), { status: 500 }),
  })

  await assert.rejects(() => provider.provision(baseInput), (error: unknown) => {
    const mapped = mapLiveStreamProviderError(error)
    assert.equal(mapped.code, "PROVIDER_REQUEST_FAILED")
    assert.equal(mapped.status, 502)
    assert.equal(mapped.reason, "Live stream provider request failed")
    return true
  })
})

test("missing mux credentials do not leak secret values", async () => {
  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "mux",
      MUX_TOKEN_ID: "token-id",
      NODE_ENV: "production",
    },
  })

  await assert.rejects(() => provider.provision(baseInput), (error: unknown) => {
    assert.ok(error instanceof LiveStreamProviderError)
    assert.equal(error.code, "PROVIDER_CONFIGURATION_ERROR")
    assert.doesNotMatch(error.message, /token-secret|token-id/i)
    return true
  })
})
