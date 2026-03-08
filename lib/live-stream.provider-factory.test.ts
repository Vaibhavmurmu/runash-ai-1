import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
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

test("createLiveStreamProvider rejects unsupported provider", () => {
  assert.throws(
    () =>
      createLiveStreamProvider({
        env: {
          RUNASH_LIVE_STREAM_PROVIDER: "invalid-provider",
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
  const playbackId = randomUUID().replace(/-/g, "")
  const providerSessionId = randomUUID()
  const streamKey = `sk_${randomUUID().replace(/-/g, "")}`

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
            id: providerSessionId,
            stream_key: streamKey,
            playback_ids: [{ id: playbackId, policy: "public" }],
          },
        }),
        { status: 200 },
      )
    },
  })

  const provisioned = await provider.provision(baseInput)
  assert.equal(provisioned.provider, "mux")
  assert.equal(provisioned.providerSessionId, providerSessionId)
  assert.equal(provisioned.ingestToken, streamKey)
  assert.equal(provisioned.playbackUrls[0]?.url, `https://stream.mux.com/${playbackId}.m3u8`)

  await provider.stop({ sessionId: baseInput.sessionId, providerSessionId: provisioned.providerSessionId })
  assert.equal(calls.length, 2)
  assert.match(calls[1] ?? "", /\/complete$/)
})

test("livepeer adapter provisions and tears down stream via mocked API", async () => {
  const livepeerId = randomUUID()
  const streamKey = `lp_${randomUUID().replace(/-/g, "")}`
  const playbackId = randomUUID().replace(/-/g, "")
  const ingestUrl = `rtmp://ingest.livepeer.test/live/${randomUUID().slice(0, 8)}`
  let deleteInvoked = false

  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "livepeer",
      LIVEPEER_API_TOKEN: "lp-token",
      NODE_ENV: "production",
    },
    fetchImpl: async (url, init) => {
      if (String(init?.method ?? "POST") === "DELETE") {
        deleteInvoked = true
        assert.match(String(url), new RegExp(`/stream/${livepeerId}$`))
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      return new Response(
        JSON.stringify({
          id: livepeerId,
          streamKey,
          playbackId,
          rtmpIngestUrl: ingestUrl,
          playbackPolicy: "public",
          createdAt: Date.now(),
        }),
        { status: 200 },
      )
    },
  })

  const provisioned = await provider.provision(baseInput)
  assert.equal(provisioned.provider, "livepeer")
  assert.equal(provisioned.providerSessionId, livepeerId)
  assert.equal(provisioned.ingestUrl, ingestUrl)
  assert.equal(provisioned.ingestToken, streamKey)
  assert.match(provisioned.playbackUrls[0]?.url ?? "", new RegExp(`/hls/${playbackId}/index\.m3u8$`))

  await provider.stop({ sessionId: baseInput.sessionId, providerSessionId: livepeerId })
  assert.equal(deleteInvoked, true)
})

test("internal provider returns playback and token expiry metadata", async () => {
  const providerSessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const ingestToken = `int_${randomUUID().replace(/-/g, "")}`

  const provider = createLiveStreamProvider({
    env: {
      RUNASH_LIVE_STREAM_PROVIDER: "internal",
      RUNASH_INTERNAL_LIVE_STREAM_API_BASE_URL: "https://stream.internal.test",
      RUNASH_INTERNAL_LIVE_STREAM_API_KEY: "internal-token",
      NODE_ENV: "production",
    },
    fetchImpl: async (_url, init) => {
      if (String(init?.method ?? "POST") === "DELETE") {
        return new Response(JSON.stringify({ deleted: true }), { status: 200 })
      }

      return new Response(
        JSON.stringify({
          data: {
            id: providerSessionId,
            ingest: {
              url: `rtmps://stream.internal.test/ingest/${providerSessionId}`,
              token: ingestToken,
              expiresAt,
            },
            playback: [
              { protocol: "hls", url: `https://cdn.internal.test/hls/${providerSessionId}.m3u8` },
              { protocol: "dash", url: `https://cdn.internal.test/dash/${providerSessionId}.mpd` },
            ],
            metadata: {
              region: "us-east-1",
            },
          },
        }),
        { status: 200 },
      )
    },
  })

  const provisioned = await provider.provision(baseInput)
  assert.equal(provisioned.provider, "internal")
  assert.equal(provisioned.providerSessionId, providerSessionId)
  assert.equal(provisioned.ingestToken, ingestToken)
  assert.equal(provisioned.tokenExpiresAt, expiresAt)
  assert.equal(provisioned.playbackUrls.length, 2)

  await provider.stop({ sessionId: baseInput.sessionId, providerSessionId })
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

test("missing credentials do not leak secret values", async () => {
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
