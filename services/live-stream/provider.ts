import { randomUUID } from "node:crypto"
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

type ProviderName = "mux" | "livepeer" | "internal" | "mock"
type ProviderEnv = NodeJS.ProcessEnv | Record<string, string | undefined>

type MuxCredentials = {
  tokenId: string
  tokenSecret: string
}

type ProviderErrorMapping = {
  code: string
  status: number
  reason: string
  userMessage: string
  correlationId: string
}

type LiveStreamVendorAdapter = {
  readonly provider: Exclude<ProviderName, "mock">
  provision(input: ProvisionLiveStreamInput, context: { correlationId: string }): Promise<ProvisionLiveStreamResult>
  stop(input: { sessionId: string; providerSessionId: string }, context: { correlationId: string }): Promise<void>
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

function createCorrelationId(): string {
  return randomUUID()
}

function extractCorrelationId(message: string): string {
  const matched = message.match(/correlationId=([0-9a-f-]{36})/i)
  return matched?.[1] ?? "unknown"
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
  provider: Exclude<ProviderName, "mock">
  baseUrl: string
  path: string
  method?: "GET" | "POST" | "DELETE"
  body?: Record<string, unknown>
  operation: "provision" | "stop"
  sessionId: string
  env: ProviderEnv
  headers: Record<string, string>
  correlationId: string
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
          "x-request-id": input.correlationId,
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
          correlationId: input.correlationId,
          errorType: typeof payload === "object" && payload && "error" in payload ? payload.error?.type ?? null : null,
        })

        if (canRetry) {
          await wait(150 * attempt)
          continue
        }

        throw new LiveStreamProviderError(
          `${input.provider} API request failed for ${input.operation} with status ${response.status}. correlationId=${input.correlationId}`,
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
        correlationId: input.correlationId,
        ...(isAbortError ? { reason: "timeout" } : { error: sanitizeError(error) }),
      })

      if (canRetry) {
        await wait(150 * attempt)
        continue
      }

      throw new LiveStreamProviderError(`${input.provider} API request failed. correlationId=${input.correlationId}`, "PROVIDER_REQUEST_FAILED", {
        cause: error,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new LiveStreamProviderError(
    `Live stream provider unavailable after retries. correlationId=${input.correlationId}`,
    "PROVIDER_UNAVAILABLE",
  )
}

class MuxVendorAdapter implements LiveStreamVendorAdapter {
  readonly provider = "mux" as const

  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput, context: { correlationId: string }): Promise<ProvisionLiveStreamResult> {
    const response = await requestProvider<MuxCreateLiveStreamResponse>({
      provider: this.provider,
      baseUrl: MUX_API_BASE,
      path: "/live-streams",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
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
      provider: this.provider,
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

  async stop(input: { sessionId: string; providerSessionId: string }, context: { correlationId: string }): Promise<void> {
    await requestProvider({
      provider: this.provider,
      baseUrl: MUX_API_BASE,
      path: `/live-streams/${encodeURIComponent(input.providerSessionId)}/complete`,
      method: "POST",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: createMuxAuthHeader(readMuxCredentials(this.env)),
      },
    })
  }
}

class LivepeerVendorAdapter implements LiveStreamVendorAdapter {
  readonly provider = "livepeer" as const

  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput, context: { correlationId: string }): Promise<ProvisionLiveStreamResult> {
    const apiToken = readRequiredEnv(this.env, "LIVEPEER_API_TOKEN", "Livepeer provider requires LIVEPEER_API_TOKEN")

    const response = await requestProvider<LivepeerCreateStreamResponse>({
      provider: this.provider,
      baseUrl: LIVEPEER_API_BASE,
      path: "/stream",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
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
      provider: this.provider,
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

  async stop(input: { sessionId: string; providerSessionId: string }, context: { correlationId: string }): Promise<void> {
    const apiToken = readRequiredEnv(this.env, "LIVEPEER_API_TOKEN", "Livepeer provider requires LIVEPEER_API_TOKEN")

    await requestProvider({
      provider: this.provider,
      baseUrl: LIVEPEER_API_BASE,
      path: `/stream/${encodeURIComponent(input.providerSessionId)}`,
      method: "DELETE",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    })
  }
}

class InternalVendorAdapter implements LiveStreamVendorAdapter {
  readonly provider = "internal" as const

  constructor(
    private readonly env: ProviderEnv,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async provision(input: ProvisionLiveStreamInput, context: { correlationId: string }): Promise<ProvisionLiveStreamResult> {
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
      provider: this.provider,
      baseUrl,
      path: "/v1/live-streams",
      operation: "provision",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
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
      provider: this.provider,
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

  async stop(input: { sessionId: string; providerSessionId: string }, context: { correlationId: string }): Promise<void> {
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
      provider: this.provider,
      baseUrl,
      path: `/v1/live-streams/${encodeURIComponent(input.providerSessionId)}`,
      method: "DELETE",
      operation: "stop",
      sessionId: input.sessionId,
      env: this.env,
      correlationId: context.correlationId,
      fetchImpl: this.fetchImpl,
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    })
  }
}

class ProviderBackedLiveStreamProvider implements LiveStreamProvider {
  constructor(private readonly adapter: LiveStreamVendorAdapter) {}

  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const correlationId = createCorrelationId()
    const provisioned = await this.adapter.provision(input, { correlationId })

    return {
      ...provisioned,
      metadata: {
        ...provisioned.metadata,
        correlationId,
      },
    }
  }

  async stop(input: { sessionId: string; providerSessionId: string }): Promise<void> {
    const correlationId = createCorrelationId()
    await this.adapter.stop(input, { correlationId })
  }
}

class MockLiveStreamProvider implements LiveStreamProvider {
  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const correlationId = createCorrelationId()
    const providerSessionId = `mock_${input.sessionId}`

    return {
      provider: "mock",
      providerSessionId,
      ingestUrl: "rtmps://mock.ingest.runash.local/app",
      ingestToken: `mock_token_${providerSessionId}`,
      tokenExpiresAt: null,
      playbackUrls: [{ protocol: "hls", url: `https://mock-playback.runash.local/${providerSessionId}.m3u8` }],
      metadata: {
        providerSessionId,
        dvrEnabled: input.dvrEnabled,
        latencyProfile: input.latencyProfile,
        ownerUserId: input.ownerUserId,
        workspaceId: input.workspaceId,
        correlationId,
      },
    }
  }

  async stop(_input: { sessionId: string; providerSessionId: string }): Promise<void> {
    return Promise.resolve()
  }
}

function isDeployedEnvironment(env: ProviderEnv): boolean {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? ""
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? ""
  const runashEnv = env.RUNASH_ENV?.trim().toLowerCase() ?? ""

  if (nodeEnv === "production") return true
  if (vercelEnv === "production" || vercelEnv === "preview") return true
  if (runashEnv === "production" || runashEnv === "staging") return true

  return false
}

export function resolveLiveStreamProvider(
  env: ProviderEnv,
  options?: {
    allowMockProvider?: boolean
  },
): ProviderName {
  const configuredProvider = env.RUNASH_LIVE_STREAM_PROVIDER?.trim().toLowerCase() ?? ""
  const mockEnabled = env.RUNASH_ENABLE_MOCK_LIVE_STREAM_PROVIDER?.trim().toLowerCase() === "true"
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? ""
  const mockAllowedForHarness = options?.allowMockProvider === true
  const deployedEnvironment = isDeployedEnvironment(env)

  if (configuredProvider === "mux") return "mux"
  if (configuredProvider === "livepeer") return "livepeer"
  if (configuredProvider === "internal") return "internal"
  if (configuredProvider === "mock") {
    if (!mockAllowedForHarness) {
      throw new LiveStreamProviderError(
        "Mock live stream provider is restricted to explicit test/development harness usage via createLiveStreamProvider({ allowMockProvider: true }).",
        "PROVIDER_CONFIGURATION_ERROR",
      )
    }

    if (!mockEnabled || deployedEnvironment || (nodeEnv !== "test" && nodeEnv !== "development")) {
      throw new LiveStreamProviderError(
        "Mock live stream provider is disabled. Set RUNASH_ENABLE_MOCK_LIVE_STREAM_PROVIDER=true only for NODE_ENV=test|development harness usage and never in deployed environments.",
        "PROVIDER_CONFIGURATION_ERROR",
      )
    }

    return "mock"
  }

  throw new LiveStreamProviderError(
    "No valid live stream provider is configured. Set RUNASH_LIVE_STREAM_PROVIDER to mux, livepeer, or internal for runtime sessions (mock is harness-only).",
    "PROVIDER_CONFIGURATION_ERROR",
  )
}

export function createLiveStreamProvider(options?: {
  env?: ProviderEnv
  fetchImpl?: typeof fetch
  allowMockProvider?: boolean
}): LiveStreamProvider {
  const env = options?.env ?? process.env
  const provider = resolveLiveStreamProvider(env, { allowMockProvider: options?.allowMockProvider })

  if (provider === "mux") {
    return new ProviderBackedLiveStreamProvider(new MuxVendorAdapter(env, options?.fetchImpl))
  }

  if (provider === "livepeer") {
    return new ProviderBackedLiveStreamProvider(new LivepeerVendorAdapter(env, options?.fetchImpl))
  }

  if (provider === "internal") {
    return new ProviderBackedLiveStreamProvider(new InternalVendorAdapter(env, options?.fetchImpl))
  }

  return new MockLiveStreamProvider()
}

export function mapLiveStreamProviderError(error: unknown): ProviderErrorMapping {
  if (error instanceof LiveStreamProviderError) {
    const correlationId = extractCorrelationId(error.message)

    if (error.code === "PROVIDER_UNAVAILABLE") {
      return {
        code: error.code,
        status: 503,
        reason: "Live stream provider unavailable",
        userMessage: "Live stream service is temporarily unavailable. Please retry in a few minutes.",
        correlationId,
      }
    }

    if (error.code === "PROVIDER_REQUEST_FAILED") {
      return {
        code: error.code,
        status: 502,
        reason: "Live stream provider request failed",
        userMessage: "Live stream provider request failed. Please verify stream settings and try again.",
        correlationId,
      }
    }

    return {
      code: error.code,
      status: 500,
      reason: "Live stream provider configuration error",
      userMessage: "Live stream provider is misconfigured. Please contact support.",
      correlationId,
    }
  }

  return {
    code: "PROVIDER_UNKNOWN",
    status: 500,
    reason: "Live stream provider integration failure",
    userMessage: "Live stream provider encountered an unexpected error. Please contact support.",
    correlationId: "unknown",
  }
}

export function getLiveStreamProvider(): LiveStreamProvider {
  return createLiveStreamProvider({ env: process.env, allowMockProvider: false })
}
