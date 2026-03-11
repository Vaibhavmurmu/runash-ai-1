export interface AnalyticsData {
  totalViews: number
  currentViewers: number
  peakViewers: number
  averageViewers: number
  watchTime: number
  chatMessages: number
  newFollowers: number
  donations: number
  engagement: number
  streamHealth: "Excellent" | "Good" | "Fair" | "Poor"
  revenue: number
  subscriptions: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
}

export interface PlatformAnalytics {
  platform: string
  viewers: number
  chatMessages: number
  followers: number
  subscribers: number
  donations: number
  revenue: number
  engagement: number
  color: string
}

export interface AudienceData {
  demographics: {
    ageGroups: { range: string; percentage: number }[]
    genderDistribution: { gender: string; percentage: number }[]
    topCountries: { country: string; viewers: number; percentage: number }[]
  }
  deviceTypes: { device: string; percentage: number }[]
  viewerRetention: { minute: number; percentage: number }[]
}

export interface AnalyticsRequestFilters {
  platforms?: string[]
  categories?: string[]
  streamTypes?: string[]
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private eventSource: EventSource | null = null
  private realTimeCallbacks: Map<string, (data: any) => void> = new Map()

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  private async fetchJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const response = await fetch(endpoint, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new Error(`Analytics request failed (${response.status})`)
    }

    return (await response.json()) as T
  }

  public subscribeToRealTimeUpdates(streamId: string, callback: (data: AnalyticsData) => void): () => void {
    const callbackId = `${streamId}-${Date.now()}`
    this.realTimeCallbacks.set(callbackId, callback)

    if (!this.eventSource) {
      this.eventSource = new EventSource(`/api/analytics/realtime/stream?streamId=${streamId}`)

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.realTimeCallbacks.forEach((cb) => cb(data))
        } catch (error) {
          console.error("Error parsing real-time analytics data:", error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error("Real-time analytics connection error:", error)
      }
    }

    // Return unsubscribe function
    return () => {
      this.realTimeCallbacks.delete(callbackId)
      if (this.realTimeCallbacks.size === 0 && this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
    }
  }

  // Real-time Analytics
  public async getRealTimeAnalytics(streamId?: string): Promise<AnalyticsData> {
    try {
      const endpoint = streamId ? `/api/analytics/realtime?streamId=${streamId}` : "/api/analytics/realtime"
      return await this.fetchJson<AnalyticsData>(endpoint)
    } catch (error) {
      console.error("Failed to fetch real-time analytics:", error)
      throw error
    }
  }

  // Historical Analytics
  public async getHistoricalAnalytics(
    period: string,
    streamId?: string,
    filters?: AnalyticsRequestFilters,
  ): Promise<{
    viewerCounts: TimeSeriesData[]
    chatActivity: TimeSeriesData[]
    followerGrowth: TimeSeriesData[]
    revenue: TimeSeriesData[]
    engagement: TimeSeriesData[]
    watchTime: TimeSeriesData[]
  }> {
    try {
      const params = new URLSearchParams({ period })
      if (streamId) params.append("streamId", streamId)
      if (filters?.platforms?.length) params.append("platforms", filters.platforms.join(","))
      if (filters?.categories?.length) params.append("categories", filters.categories.join(","))
      if (filters?.streamTypes?.length) params.append("streamTypes", filters.streamTypes.join(","))

      return await this.fetchJson(`/api/analytics/historical?${params}`)
    } catch (error) {
      console.error("Failed to fetch historical analytics:", error)
      throw error
    }
  }

  public async getOverviewAnalytics(period: string, streamId?: string): Promise<{
    totalViews: number
    revenue: number
    avgWatchTimeSeconds: number
    engagementRate: number
    change: { views: number; revenue: number; watch: number; engagement: number }
  }> {
    const params = new URLSearchParams({ period })
    if (streamId) params.append("streamId", streamId)
    return this.fetchJson(`/api/analytics/overview?${params}`)
  }

  public async getContentAnalytics(period: string, streamId?: string, filters?: AnalyticsRequestFilters) {
    const params = new URLSearchParams({ period })
    if (streamId) params.append("streamId", streamId)
    if (filters?.platforms?.length) params.append("platforms", filters.platforms.join(","))
    if (filters?.categories?.length) params.append("categories", filters.categories.join(","))
    if (filters?.streamTypes?.length) params.append("streamTypes", filters.streamTypes.join(","))
    return this.fetchJson(`/api/analytics/content?${params}`)
  }

  // Platform Analytics
  public async getPlatformAnalytics(period: string): Promise<PlatformAnalytics[]> {
    try {
      const { platforms } = await this.fetchJson<{ platforms: PlatformAnalytics[] }>(`/api/analytics/platforms?period=${period}`)
      return platforms
    } catch (error) {
      console.error("Failed to fetch platform analytics:", error)
      return []
    }
  }

  // Audience Analytics
  public async getAudienceAnalytics(period: string, streamId?: string): Promise<AudienceData> {
    try {
      const params = new URLSearchParams({ period })
      if (streamId) params.append("streamId", streamId)

      const response = await fetch(`/api/analytics/audience?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch audience analytics")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to fetch audience analytics:", error)
      throw error
    }
  }

  // Revenue Analytics
  public async getRevenueAnalytics(period: string): Promise<{
    totalRevenue: number
    revenueBySource: { source: string; amount: number; percentage: number }[]
    revenueTimeline: TimeSeriesData[]
    topEarningStreams: { streamId: string; title: string; revenue: number }[]
  }> {
    try {
      const response = await fetch(`/api/analytics/revenue?period=${period}`)

      if (!response.ok) {
        throw new Error("Failed to fetch revenue analytics")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to fetch revenue analytics:", error)
      throw error
    }
  }

  // Stream Health Analytics
  public async getStreamHealth(streamId: string): Promise<{
    bitrate: number
    fps: number
    droppedFrames: number
    bandwidth: number
    latency: number
    quality: string
    issues: { type: string; severity: string; message: string; timestamp: string }[]
  }> {
    try {
      const response = await fetch(`/api/analytics/stream-health/${streamId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch stream health")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to fetch stream health:", error)
      throw error
    }
  }

  // Comparative Analytics
  public async getComparativeAnalytics(
    streamIds: string[],
    period: string,
  ): Promise<{
    streams: {
      streamId: string
      title: string
      metrics: AnalyticsData
    }[]
    comparison: {
      metric: string
      values: { streamId: string; value: number }[]
    }[]
  }> {
    try {
      const response = await fetch("/api/analytics/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamIds, period }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch comparative analytics")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to fetch comparative analytics:", error)
      throw error
    }
  }

  // Export Analytics
  public async exportAnalytics(format: "csv" | "json" | "pdf", period: string, streamId?: string): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format, period })
      if (streamId) params.append("streamId", streamId)

      const response = await fetch(`/api/analytics/export?${params}`)

      if (!response.ok) {
        throw new Error("Failed to export analytics")
      }

      return await response.blob()
    } catch (error) {
      console.error("Failed to export analytics:", error)
      throw error
    }
  }

  // AI Insights
  public async getAIInsights(
    period: string,
    streamId?: string,
  ): Promise<{
    insights: {
      type: "trend" | "anomaly" | "recommendation" | "prediction"
      title: string
      description: string
      impact: "high" | "medium" | "low"
      actionable: boolean
      data?: any
    }[]
    predictions: {
      metric: string
      currentValue: number
      predictedValue: number
      confidence: number
      timeframe: string
    }[]
  }> {
    try {
      const params = new URLSearchParams({ period })
      if (streamId) params.append("streamId", streamId)

      const response = await fetch(`/api/analytics/ai-insights?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch AI insights")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to fetch AI insights:", error)
      throw error
    }
  }
}
