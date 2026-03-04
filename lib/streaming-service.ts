import type {
  DashboardRecentStreamsResponse,
  DashboardScheduledStreamsResponse,
  IntegrationKeyResponse,
  InviteCollaboratorRequest,
  InviteCollaboratorResponse,
  ScheduleStreamRequest,
  ScheduleStreamResponse,
  StartStreamRequest,
  StartStreamResponse,
  DashboardStreamDetailsResponse,
  FollowUpCreationResponse,
  LatestCompletedStreamSummaryResponse,
  RestoreLastStreamDraftResponse,
} from "@/lib/types/dashboard-streams"
import { fetchApiData } from "@/lib/api/client"

import { BackgroundSync } from "./background-sync" // Assuming BackgroundSync is in a separate file

async function dashboardStreamsRequest<T>(input: RequestInfo, init: RequestInit, fallback: string): Promise<T> {
  return fetchApiData<T>(input, { init, fallbackMessage: fallback })
}

export const dashboardStreamingService = {
  fetchRecentStreams(limit?: number) {
    const suffix = typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
    return dashboardStreamsRequest<DashboardRecentStreamsResponse>(
      `/api/dashboard/streams/recent${suffix}`,
      { method: "GET" },
      "Failed to fetch recent streams",
    )
  },
  fetchScheduledStreams() {
    return dashboardStreamsRequest<DashboardScheduledStreamsResponse>(
      "/api/dashboard/streams/scheduled",
      { method: "GET" },
      "Failed to fetch scheduled streams",
    )
  },
  startStream(payload: StartStreamRequest) {
    return dashboardStreamsRequest<StartStreamResponse>(
      "/api/dashboard/streams/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Failed to start stream",
    )
  },
  scheduleStream(payload: ScheduleStreamRequest) {
    return dashboardStreamsRequest<ScheduleStreamResponse>(
      "/api/dashboard/streams/schedule",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Failed to schedule stream",
    )
  },
  inviteCollaborator(payload: InviteCollaboratorRequest) {
    return dashboardStreamsRequest<InviteCollaboratorResponse>(
      "/api/dashboard/streams/invite",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Failed to invite collaborator",
    )
  },
  fetchIntegrationKey() {
    return dashboardStreamsRequest<IntegrationKeyResponse>(
      "/api/dashboard/streams/integration-key",
      { method: "POST" },
      "Failed to fetch integration key",
    )
  },
  fetchStreamDetails(streamId: string) {
    return dashboardStreamsRequest<DashboardStreamDetailsResponse>(
      `/api/dashboard/streams/${encodeURIComponent(streamId)}`,
      { method: "GET" },
      "Failed to fetch stream details",
    )
  },
  async openPreviousLiveSessionContext() {
    const restoreDraft = await this.restoreLastStreamConfigurationDraft()
    if (restoreDraft.draft?.streamId) {
      return restoreDraft.draft.streamId
    }

    const [recentData, scheduledData] = await Promise.all([this.fetchRecentStreams(1), this.fetchScheduledStreams()])
    const target = scheduledData.streams[0] ?? recentData.streams[0]
    return target?.id ?? null
  },
  fetchLatestCompletedStreamSummary() {
    return dashboardStreamsRequest<LatestCompletedStreamSummaryResponse>(
      "/api/dashboard/streams/previous-live/summary",
      { method: "GET" },
      "Failed to fetch latest completed stream summary",
    )
  },
  restoreLastStreamConfigurationDraft() {
    return dashboardStreamsRequest<RestoreLastStreamDraftResponse>(
      "/api/dashboard/streams/previous-live/restore-draft",
      { method: "POST" },
      "Failed to restore last stream configuration draft",
    )
  },
  createFollowUpFromPreviousLiveSession() {
    return dashboardStreamsRequest<FollowUpCreationResponse>(
      "/api/dashboard/streams/previous-live/follow-up",
      { method: "POST" },
      "Failed to create follow-up from previous live session",
    )
  },
}

export interface StreamData {
  id: string
  title: string
  description?: string
  status: "scheduled" | "live" | "ended"
  platform: string
  streamKey: string
  viewerCount: number
  startTime?: string
  endTime?: string
  duration?: number
  thumbnailUrl?: string
}

export interface StreamMetrics {
  viewerCount: number
  streamHealth: "Excellent" | "Good" | "Fair" | "Poor"
  bitrate: number
  fps: number
  droppedFrames: number
  bandwidth: number
  latency: number
}

export class StreamingService {
  private static instance: StreamingService
  private currentStream: StreamData | null = null
  private metricsInterval: NodeJS.Timeout | null = null
  private streamListeners: ((stream: StreamData | null) => void)[] = []
  private metricsListeners: ((metrics: StreamMetrics) => void)[] = []
  private backgroundSync: BackgroundSync

  private constructor() {
    this.backgroundSync = BackgroundSync.getInstance()
  }

  public static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService()
    }
    return StreamingService.instance
  }

  public async createStream(title: string, description: string, platform: string): Promise<StreamData> {
    try {
      const response = await fetch("/api/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, platform }),
      })

      if (!response.ok) {
        throw new Error("Failed to create stream")
      }

      const { stream } = await response.json()
      this.currentStream = stream

      this.backgroundSync.addToSyncQueue({
        type: "stream",
        action: "create",
        data: stream,
      })

      this.notifyStreamListeners()
      return stream
    } catch (error) {
      console.error("Failed to create stream:", error)
      throw error
    }
  }

  public async startStream(streamId: string): Promise<void> {
    try {
      const response = await fetch("/api/streams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: streamId,
          status: "live",
          startTime: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start stream")
      }

      const { stream } = await response.json()
      this.currentStream = stream

      this.backgroundSync.addToSyncQueue({
        type: "stream",
        action: "update",
        data: stream,
      })

      this.startMetricsCollection()
      this.notifyStreamListeners()
    } catch (error) {
      console.error("Failed to start stream:", error)
      throw error
    }
  }

  public async stopStream(streamId: string): Promise<void> {
    try {
      const response = await fetch("/api/streams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: streamId,
          status: "ended",
          endTime: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to stop stream")
      }

      const { stream } = await response.json()
      this.currentStream = stream
      this.stopMetricsCollection()
      this.notifyStreamListeners()
    } catch (error) {
      console.error("Failed to stop stream:", error)
      throw error
    }
  }

  public async getUserStreams(): Promise<StreamData[]> {
    try {
      const response = await fetch("/api/streams")
      if (!response.ok) {
        throw new Error("Failed to fetch streams")
      }

      const { streams } = await response.json()
      return streams
    } catch (error) {
      console.error("Failed to fetch streams:", error)
      return []
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        // In a real implementation, this would fetch from WebRTC stats or streaming server
        const metrics = await this.collectStreamMetrics()
        this.notifyMetricsListeners(metrics)

        if (this.currentStream) {
          await this.updateViewerCount(this.currentStream.id, metrics.viewerCount)
        }
      } catch (error) {
        console.error("Failed to collect metrics:", error)
      }
    }, 5000) // Update every 5 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
  }

  private async collectStreamMetrics(): Promise<StreamMetrics> {
    // In a real implementation, this would collect from WebRTC stats API
    // For now, we'll simulate realistic metrics
    const baseViewers = this.currentStream?.viewerCount || 0
    const viewerVariation = Math.floor(Math.random() * 10) - 5
    const viewerCount = Math.max(0, baseViewers + viewerVariation)

    const bitrate = 2500 + Math.floor(Math.random() * 500) // 2.5-3 Mbps
    const fps = 30 + Math.floor(Math.random() * 5) // 30-35 fps
    const droppedFrames = Math.floor(Math.random() * 5) // 0-5 dropped frames
    const bandwidth = bitrate * 1.2 // Slightly higher than bitrate
    const latency = 60 + Math.floor(Math.random() * 90) // 60-150ms

    // Determine stream health based on metrics
    let streamHealth: StreamMetrics["streamHealth"] = "Excellent"
    if (droppedFrames > 3 || bitrate < 2000) {
      streamHealth = "Poor"
    } else if (droppedFrames > 1 || bitrate < 2200) {
      streamHealth = "Fair"
    } else if (droppedFrames > 0 || bitrate < 2400) {
      streamHealth = "Good"
    }

    return {
      viewerCount,
      streamHealth,
      bitrate,
      fps,
      droppedFrames,
      bandwidth,
      latency,
    }
  }

  private async updateViewerCount(streamId: string, viewerCount: number): Promise<void> {
    try {
      await fetch("/api/streams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: streamId, viewerCount }),
      })
    } catch (error) {
      console.error("Failed to update viewer count:", error)
    }
  }

  // Event listeners
  public onStreamChange(callback: (stream: StreamData | null) => void): () => void {
    this.streamListeners.push(callback)
    return () => {
      this.streamListeners = this.streamListeners.filter((cb) => cb !== callback)
    }
  }

  public onMetricsChange(callback: (metrics: StreamMetrics) => void): () => void {
    this.metricsListeners.push(callback)
    return () => {
      this.metricsListeners = this.metricsListeners.filter((cb) => cb !== callback)
    }
  }

  private notifyStreamListeners(): void {
    this.streamListeners.forEach((listener) => listener(this.currentStream))
  }

  private notifyMetricsListeners(metrics: StreamMetrics): void {
    this.metricsListeners.forEach((listener) => listener(metrics))
  }

  // Getters
  public getCurrentStream(): StreamData | null {
    return this.currentStream
  }

  public setCurrentStream(stream: StreamData | null): void {
    this.currentStream = stream
    this.notifyStreamListeners()
  }
}
