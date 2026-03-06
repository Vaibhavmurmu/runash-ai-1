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
  ingestUrl: string
  ingestToken: string
  tokenExpiresAt: string | null
  playbackUrls: LiveStreamPlaybackUrl[]
  metadata: Record<string, unknown>
}

export interface LiveStreamProvider {
  provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult>
  stop(input: { sessionId: string }): Promise<void>
}

class MockLiveStreamProvider implements LiveStreamProvider {
  async provision(input: ProvisionLiveStreamInput): Promise<ProvisionLiveStreamResult> {
    const token = `ls_${input.sessionId.replace(/-/g, "").slice(0, 20)}`
    return {
      provider: "runash-mock-live",
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

  async stop(): Promise<void> {
    return
  }
}

let singletonProvider: LiveStreamProvider | null = null

export function getLiveStreamProvider(): LiveStreamProvider {
  if (!singletonProvider) {
    singletonProvider = new MockLiveStreamProvider()
  }

  return singletonProvider
}
