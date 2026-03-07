import type { LiveStreamLatencyProfile, LiveStreamPlaybackUrl } from "@/types/live-stream-domain"

export type ProvisionLiveStreamInput = {
  sessionId: string
  ownerUserId: number
  workspaceId: string | null
  dvrEnabled: boolean
  latencyProfile: LiveStreamLatencyProfile
}

export type ProvisionLiveStreamResult = {
  provider: string
  providerSessionId: string
  ingestUrl: string
  ingestToken: string
  tokenExpiresAt: string | null
  playbackUrls: LiveStreamPlaybackUrl[]
  metadata: Record<string, unknown>
}

export interface LiveStreamProvider {
  provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult>
  stop(input: { sessionId: string; providerSessionId: string }): Promise<void>
}

class LiveStreamProviderError extends Error {
  readonly code: "PROVIDER_REQUEST_FAILED" | "PROVIDER_CONFIGURATION_ERROR" | "PROVIDER_UNAVAILABLE"

  constructor(message: string, code: LiveStreamProviderError["code"], options?: { cause?: unknown }) {
    super(message)
    this.name = "LiveStreamProviderError"
    this.code = code
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

const MUX_API_BASE = "https://api.mux.com/video/v1"

type MuxCreateLiveStreamResponse = {
  data?: {
    id?: string
    stream_key?: string
    created_at?: string
    playback_ids?: Array<{ id?: string; policy?: string }>
  }
}

function parseIntegerEnv(name: string, defaultValue: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10)
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue
  return parsed
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  return { name: "UnknownError", message: "Unknown provider error" }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function createMuxAuthHeader(): string {
  const tokenId = process.env.MUX_TOKEN_ID?.trim()
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim()

  if (!tokenId || !tokenSecret) {
    throw new LiveStreamProviderError(
      "Mux provider requires MUX_TOKEN_ID and MUX_TOKEN_SECRET",
      "PROVIDER_CONFIGURATION_ERROR",
    )
  }

  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`
}

async function requestMux<T>(input: {
  path: string
  method?: "GET" | "POST"
  body?: Record<string, unknown>
  operation: "provision" | "stop"
  sessionId: string
}): Promise<T> {
  const retryCount = parseIntegerEnv("RUNASH_LIVE_STREAM_PROVIDER_RETRY_COUNT", 2)
  const timeoutMs = parseIntegerEnv("RUNASH_LIVE_STREAM_PROVIDER_TIMEOUT_MS", 8000)
  const maxAttempts = retryCount + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${MUX_API_BASE}${input.path}`, {
        method: input.method ?? "POST",
        headers: {
          "content-type": "application/json",
          authorization: createMuxAuthHeader(),
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      })

      const bodyText = await response.text()
      const payload = bodyText ? (JSON.parse(bodyText) as T | { error?: { type?: string; messages?: string[] } }) : ({} as T)

      if (!response.ok) {
        const canRetry = attempt < maxAttempts && isRetryableStatus(response.status)
        console.error("[live-stream.provider] provider_request_failed", {
          provider: "mux",
          operation: input.operation,
          sessionId: input.sessionId,
          path: input.path,
          attempt,
          maxAttempts,
          status: response.status,
          retrying: canRetry,
          errorType: typeof payload === "object" && payload && "error" in payload ? payload.error?.type ?? null : null,
        })

        if (canRetry) {
          await wait(150 * attempt)
          continue
        }

        throw new LiveStreamProviderError(
          `Mux API request failed for ${input.operation} with status ${response.status}`,
          "PROVIDER_REQUEST_FAILED",
        )
      }

      return payload as T
    } catch (error) {
      const canRetry = attempt < maxAttempts
      const isAbortError = error instanceof Error && error.name === "AbortError"

      console.error("[live-stream.provider] provider_request_exception", {
        provider: "mux",
        operation: input.operation,
        sessionId: input.sessionId,
        path: input.path,
        attempt,
        maxAttempts,
        timeoutMs,
        retrying: canRetry,
        ...(isAbortError ? { reason: "timeout" } : { error: sanitizeError(error) }),
      })

      if (canRetry) {
        await wait(150 * attempt)
        continue
      }

      throw new LiveStreamProviderError("Mux API request failed", "PROVIDER_REQUEST_FAILED", { cause: error })
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new LiveStreamProviderError("Mux API unavailable after retries", "PROVIDER_UNAVAILABLE")
}

class MuxLiveStreamProvider implements LiveStreamProvider {
  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const response = await requestMux<MuxCreateLiveStreamResponse>({
      path: "/live-streams",
      operation: "provision",
      sessionId: input.sessionId,
      body: {
        playback_policy: ["public"],
        new_asset_settings: {
          playback_policy: ["public"],
        },
        reduced_latency: input.latencyProfile === "ultra_low",
        reconnect_window: input.dvrEnabled ? 120 : 60,
      },
    })

    const providerSessionId = response.data?.id?.trim()
    const streamKey = response.data?.stream_key?.trim()
    const playbackId = response.data?.playback_ids?.find((entry) => entry.id)?.id?.trim()

    if (!providerSessionId || !streamKey || !playbackId) {
      throw new LiveStreamProviderError("Mux provision response missing required fields", "PROVIDER_REQUEST_FAILED")
    }

    return {
      provider: "mux",
      providerSessionId,
      ingestUrl: "rtmps://global-live.mux.com:443/app",
      ingestToken: streamKey,
      tokenExpiresAt: null,
      playbackUrls: [{ protocol: "hls", url: `https://stream.mux.com/${playbackId}.m3u8` }],
      metadata: {
        playbackId,
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    }
  }

  async stop(input: { sessionId: string; providerSessionId: string }): Promise<void> {
    await requestMux({
      path: `/live-streams/${encodeURIComponent(input.providerSessionId)}/complete`,
      method: "POST",
      operation: "stop",
      sessionId: input.sessionId,
    })
  }
}

class MockLiveStreamProvider implements LiveStreamProvider {
  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const token = `ls_${input.sessionId.replace(/-/g, "").slice(0, 20)}`
    return {
      provider: "runash-mock-live",
      providerSessionId: `mock_${input.sessionId}`,
      ingestUrl: `rtmps://ingest.runash.mock/live/${input.sessionId}`,
      ingestToken: token,
      tokenExpiresAt: null,
      playbackUrls: [
        { protocol: "hls", url: `https://playback.runash.mock/hls/${input.sessionId}.m3u8` },
        { protocol: "dash", url: `https://playback.runash.mock/dash/${input.sessionId}.mpd` },
      ],
      metadata: {
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    }
  }

  async stop(_input: { sessionId: string; providerSessionId: string }): Promise<void> {
    return
  }
}

let singletonProvider: LiveStreamProvider | null = null

export function getLiveStreamProvider(): LiveStreamProvider {
  if (!singletonProvider) {
    const configuredProvider = process.env.RUNASH_LIVE_STREAM_PROVIDER?.trim().toLowerCase() ?? ""

    if (configuredProvider === "mux") {
      singletonProvider = new MuxLiveStreamProvider()
      return singletonProvider
    }

    const allowMockInNonProd = process.env.RUNASH_LIVE_STREAM_ALLOW_MOCK === "1" || process.env.NODE_ENV !== "production"
    if ((configuredProvider === "mock" || configuredProvider === "") && allowMockInNonProd) {
      singletonProvider = new MockLiveStreamProvider()
      return singletonProvider
    }

    throw new LiveStreamProviderError(
      "No valid live stream provider is configured. Set RUNASH_LIVE_STREAM_PROVIDER to a real backend (e.g. mux).",
      "PROVIDER_CONFIGURATION_ERROR",
    )
  }

  return singletonProvider
}
