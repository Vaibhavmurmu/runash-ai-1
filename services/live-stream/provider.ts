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

export class LiveStreamProviderError extends Error {
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
const LIVEPEER_API_BASE = "https://livepeer.studio/api"

type ProviderName = "mux" | "livepeer" | "internal"
type ProviderEnv = NodeJS.ProcessEnv | Record<string, string | undefined>

type MuxCredentials = {
  tokenId: string
  tokenSecret: string
}

type ProviderErrorMapping = {
  code: string
  status: number
  reason: string
}

type MuxCreateLiveStreamResponse = {
  data?: {
    id?: string
    stream_key?: string
    created_at?: string
    playback_ids?: Array<{ id?: string; policy?: string }>
  }
}

type LivepeerCreateStreamResponse = {
  id?: string
  streamKey?: string
  createdAt?: number
  playbackId?: string
  playbackPolicy?: string
  rtmpIngestUrl?: string
}

type InternalCreateStreamResponse = {
  data?: {
    id?: string
    ingest?: {
      url?: string
      token?: string
      expiresAt?: string | null
    }
    playback?: Array<{
      protocol?: LiveStreamPlaybackUrl["protocol"]
      url?: string
    }>
    metadata?: Record<string, unknown>
  }
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

function parseIntegerEnvFromEnv(env: ProviderEnv, name: string, defaultValue: number): number {
  const parsed = Number.parseInt(env[name] ?? "", 10)
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue
  return parsed
}

function readRequiredEnv(env: ProviderEnv, key: string, message: string): string {
  const value = env[key]?.trim()
  if (!value) {
    throw new LiveStreamProviderError(message, "PROVIDER_CONFIGURATION_ERROR")
  }

  return value
}

function readMuxCredentials(env: ProviderEnv): MuxCredentials {
  const tokenId = env.MUX_TOKEN_ID?.trim()
  const tokenSecret = env.MUX_TOKEN_SECRET?.trim()

  if (!tokenId || !tokenSecret) {
    throw new LiveStreamProviderError(
      "Mux provider requires MUX_TOKEN_ID and MUX_TOKEN_SECRET",
      "PROVIDER_CONFIGURATION_ERROR",
    )
  }

  return { tokenId, tokenSecret }
}

function createMuxAuthHeader(credentials: MuxCredentials): string {
  const { tokenId, tokenSecret } = credentials
  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`
}

async function requestProvider<T>(input: {
  provider: ProviderName
  baseUrl: string
  path: string
  method?: "GET" | "POST" | "DELETE"
  body?: Record<string, unknown>
  operation: "provision" | "stop"
  sessionId: string
  env: ProviderEnv
  headers: Record<string, string>
  fetchImpl?: typeof fetch
}): Promise<T> {
  const retryCount = parseIntegerEnvFromEnv(input.env, "RUNASH_LIVE_STREAM_PROVIDER_RETRY_COUNT", 2)
  const timeoutMs = parseIntegerEnvFromEnv(input.env, "RUNASH_LIVE_STREAM_PROVIDER_TIMEOUT_MS", 8000)
  const maxAttempts = retryCount + 1
  const fetchImpl = input.fetchImpl ?? fetch

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(`${input.baseUrl}${input.path}`, {
        method: input.method ?? "POST",
        headers: {
          "content-type": "application/json",
          ...input.headers,
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      })

      const bodyText = await response.text()
      const payload = bodyText ? (JSON.parse(bodyText) as T | { error?: { type?: string } }) : ({} as T)

      if (!response.ok) {
        const canRetry = attempt < maxAttempts && isRetryableStatus(response.status)
        console.error("[live-stream.provider] provider_request_failed", {
          provider: input.provider,
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
          `${input.provider} API request failed for ${input.operation} with status ${response.status}`,
          "PROVIDER_REQUEST_FAILED",
        )
      }

      return payload as T
    } catch (error) {
      const canRetry = attempt < maxAttempts
      const isAbortError = error instanceof Error && error.name === "AbortError"

      console.error("[live-stream.provider] provider_request_exception", {
        provider: input.provider,
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

      throw new LiveStreamProviderError(`${input.provider} API request failed`, "PROVIDER_REQUEST_FAILED", { cause: error })
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new LiveStreamProviderError("Live stream provider unavailable after retries", "PROVIDER_UNAVAILABLE")
}

class MuxLiveStreamProvider implements LiveStreamProvider {
  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const response = await requestProvider<MuxCreateLiveStreamResponse>({
      provider: "mux",
      baseUrl: MUX_API_BASE,
      path: "/live-streams",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: createMuxAuthHeader(readMuxCredentials(this.env)),
      },
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
        createdAt: response.data?.created_at ?? null,
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    }
  }

  async stop(input: { sessionId: string; providerSessionId: string }): Promise<void> {
    await requestProvider({
      provider: "mux",
      baseUrl: MUX_API_BASE,
      path: `/live-streams/${encodeURIComponent(input.providerSessionId)}/complete`,
      method: "POST",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: createMuxAuthHeader(readMuxCredentials(this.env)),
      },
    })
  }
}

class LivepeerLiveStreamProvider implements LiveStreamProvider {
  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const apiToken = readRequiredEnv(this.env, "LIVEPEER_API_TOKEN", "Livepeer provider requires LIVEPEER_API_TOKEN")

    const response = await requestProvider<LivepeerCreateStreamResponse>({
      provider: "livepeer",
      baseUrl: LIVEPEER_API_BASE,
      path: "/stream",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
      body: {
        name: `runash-${input.sessionId}`,
        record: input.dvrEnabled,
        profiles: input.latencyProfile === "ultra_low" ? [{ name: "240p0", bitrate: 400000, fps: 30, width: 426, height: 240 }] : undefined,
      },
    })

    const providerSessionId = response.id?.trim()
    const ingestToken = response.streamKey?.trim()
    const playbackId = response.playbackId?.trim()
    const ingestUrl = response.rtmpIngestUrl?.trim() || "rtmp://rtmp.livepeer.com/live"

    if (!providerSessionId || !ingestToken || !playbackId) {
      throw new LiveStreamProviderError("Livepeer provision response missing required fields", "PROVIDER_REQUEST_FAILED")
    }

    return {
      provider: "livepeer",
      providerSessionId,
      ingestUrl,
      ingestToken,
      tokenExpiresAt: null,
      playbackUrls: [{ protocol: "hls", url: `https://livepeercdn.studio/hls/${playbackId}/index.m3u8` }],
      metadata: {
        playbackId,
        playbackPolicy: response.playbackPolicy ?? null,
        createdAt: response.createdAt ?? null,
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    }
  }

  async stop(input: { sessionId: string; providerSessionId: string }): Promise<void> {
    const apiToken = readRequiredEnv(this.env, "LIVEPEER_API_TOKEN", "Livepeer provider requires LIVEPEER_API_TOKEN")

    await requestProvider({
      provider: "livepeer",
      baseUrl: LIVEPEER_API_BASE,
      path: `/stream/${encodeURIComponent(input.providerSessionId)}`,
      method: "DELETE",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    })
  }
}

class InternalLiveStreamProvider implements LiveStreamProvider {
  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const baseUrl = readRequiredEnv(
      this.env,
      "RUNASH_INTERNAL_LIVE_STREAM_API_BASE_URL",
      "Internal provider requires RUNASH_INTERNAL_LIVE_STREAM_API_BASE_URL",
    )
    const apiKey = readRequiredEnv(
      this.env,
      "RUNASH_INTERNAL_LIVE_STREAM_API_KEY",
      "Internal provider requires RUNASH_INTERNAL_LIVE_STREAM_API_KEY",
    )

    const response = await requestProvider<InternalCreateStreamResponse>({
      provider: "internal",
      baseUrl,
      path: "/v1/live-streams",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: {
        sessionId: input.sessionId,
        ownerUserId: input.ownerUserId,
        workspaceId: input.workspaceId,
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    })

    const providerSessionId = response.data?.id?.trim()
    const ingestUrl = response.data?.ingest?.url?.trim()
    const ingestToken = response.data?.ingest?.token?.trim()
    const tokenExpiresAt = response.data?.ingest?.expiresAt ?? null
    const playbackUrls = (response.data?.playback ?? [])
      .filter((entry) => Boolean(entry?.protocol && entry?.url))
      .map((entry) => ({ protocol: entry.protocol as LiveStreamPlaybackUrl["protocol"], url: String(entry.url) }))

    if (!providerSessionId || !ingestUrl || !ingestToken || playbackUrls.length === 0) {
      throw new LiveStreamProviderError("Internal provider response missing required fields", "PROVIDER_REQUEST_FAILED")
    }

    return {
      provider: "internal",
      providerSessionId,
      ingestUrl,
      ingestToken,
      tokenExpiresAt,
      playbackUrls,
      metadata: {
        ...(response.data?.metadata ?? {}),
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
      },
    }
  }

  async stop(input: { sessionId: string; providerSessionId: string }): Promise<void> {
    const baseUrl = readRequiredEnv(
      this.env,
      "RUNASH_INTERNAL_LIVE_STREAM_API_BASE_URL",
      "Internal provider requires RUNASH_INTERNAL_LIVE_STREAM_API_BASE_URL",
    )
    const apiKey = readRequiredEnv(
      this.env,
      "RUNASH_INTERNAL_LIVE_STREAM_API_KEY",
      "Internal provider requires RUNASH_INTERNAL_LIVE_STREAM_API_KEY",
    )

    await requestProvider({
      provider: "internal",
      baseUrl,
      path: `/v1/live-streams/${encodeURIComponent(input.providerSessionId)}`,
      method: "DELETE",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    })
  }
}

function readConfiguredProvider(env: ProviderEnv): ProviderName {
  const configuredProvider = env.RUNASH_LIVE_STREAM_PROVIDER?.trim().toLowerCase() ?? ""

  if (configuredProvider === "mux") return "mux"
  if (configuredProvider === "livepeer") return "livepeer"
  if (configuredProvider === "internal") return "internal"

  throw new LiveStreamProviderError(
    "No valid live stream provider is configured. Set RUNASH_LIVE_STREAM_PROVIDER to mux, livepeer, or internal.",
    "PROVIDER_CONFIGURATION_ERROR",
  )
}

export function createLiveStreamProvider(options?: {
  env?: ProviderEnv
  fetchImpl?: typeof fetch
}): LiveStreamProvider {
  const env = options?.env ?? process.env
  const provider = readConfiguredProvider(env)

  if (provider === "mux") {
    return new MuxLiveStreamProvider(env, options?.fetchImpl)
  }

  if (provider === "livepeer") {
    return new LivepeerLiveStreamProvider(env, options?.fetchImpl)
  }

  return new InternalLiveStreamProvider(env, options?.fetchImpl)
}

export function mapLiveStreamProviderError(error: unknown): ProviderErrorMapping {
  if (error instanceof LiveStreamProviderError) {
    if (error.code === "PROVIDER_UNAVAILABLE") {
      return { code: error.code, status: 503, reason: "Live stream provider unavailable" }
    }

    if (error.code === "PROVIDER_REQUEST_FAILED") {
      return { code: error.code, status: 502, reason: "Live stream provider request failed" }
    }

    return { code: error.code, status: 500, reason: "Live stream provider configuration error" }
  }

  return { code: "PROVIDER_UNKNOWN", status: 500, reason: "Live stream provider integration failure" }
}

export function getLiveStreamProvider(): LiveStreamProvider {
  return createLiveStreamProvider({ env: process.env })
}
