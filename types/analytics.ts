export interface StreamPerformanceMetrics {
  viewerCounts: TimeSeriesData[]
  chatActivity: TimeSeriesData[]
  followerGrowth: TimeSeriesData[]
  subscriptionGrowth: TimeSeriesData[]
  donationAmount: TimeSeriesData[]
  watchTime: TimeSeriesData[]
  engagementRate: TimeSeriesData[]
  retentionRate: TimeSeriesData[]
}

export interface TimeSeriesData {
  timestamp: string
  value: number
  platform?: string
}

export interface PlatformBreakdown {
  platform: string
  viewers: number
  chatMessages: number
  followers: number
  subscribers: number
  donations: number
  color: string
}

export interface AudienceDemographics {
  ageGroups: {
    range: string
    percentage: number
  }[]
  genderDistribution: {
    gender: string
    percentage: number
  }[]
  topCountries: {
    country: string
    viewers: number
    percentage: number
  }[]
  deviceTypes: {
    device: string
    percentage: number
  }[]
  returningViewers: number
  newViewers: number
}

export interface ContentPerformance {
  topMoments: {
    timestamp: string
    title: string
    viewerSpike: number
    chatSpike: number
  }[]
  topClips: {
    id: string
    title: string
    views: number
    shares: number
    duration: number
    thumbnailUrl?: string
  }[]
  categoryPerformance: {
    category: string
    avgViewers: number
    avgEngagement: number
    streams: number
  }[]
}

export interface StreamHealthMetrics {
  frameRate: TimeSeriesData[]
  bitrate: TimeSeriesData[]
  droppedFrames: TimeSeriesData[]
  resolution: string
  streamQuality: "excellent" | "good" | "fair" | "poor"
  buffering: {
    instances: number
    averageDuration: number
    affectedViewers: number
  }
}

export interface RevenueMetrics {
  subscriptions: {
    total: number
    new: number
    recurring: number
    revenue: number
  }
  donations: {
    total: number
    average: number
    largest: number
    topDonors: {
      name: string
      amount: number
    }[]
  }
  ads: {
    impressions: number
    revenue: number
    cpm: number
  }
  sponsorships: {
    active: number
    revenue: number
  }
  totalRevenue: number
  revenueByPlatform: {
    platform: string
    amount: number
    percentage: number
  }[]
}

export interface StreamGoal {
  id: string
  title: string
  target: number
  current: number
  type: "followers" | "subscribers" | "donations" | "viewers" | "watchTime"
  deadline?: string
  completed: boolean
}

export interface AnalyticsPeriod {
  start: string
  end: string
  label: string
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod
  platforms: string[]
  categories?: string[]
  streamTypes?: string[]
}

export interface AnalyticsApiSummary {
  streams: Record<string, string | number | null>
  chat: Record<string, string | number | null>
  recordings: Record<string, string | number | null>
  daily: Array<Record<string, string | number | null>>
}

export interface AnalyticsApiError {
  code: string
  message: string
}

export interface AnalyticsApiEnvelopeSuccess {
  success: true
  data: AnalyticsApiSummary
  error: null
  requestId?: string
}

export interface AnalyticsApiEnvelopeFailure {
  success: false
  data: null
  error: AnalyticsApiError
  requestId?: string
}

export type AnalyticsApiResponse =
  | AnalyticsApiEnvelopeSuccess
  | AnalyticsApiEnvelopeFailure
  | AnalyticsApiSummary

export type WidgetAnalyticsMetric = "viewer_count" | "streams" | "live_streams" | "avg_viewers"

export type WidgetAnalyticsDimension = "day" | "status"

export interface WidgetAnalyticsQuery {
  metric: WidgetAnalyticsMetric
  period: "24h" | "7d" | "30d" | "90d" | "1y"
  dimensions?: WidgetAnalyticsDimension[]
}

export interface WidgetAnalyticsPoint {
  label: string
  value: number
  status?: string
}

export interface WidgetAnalyticsResponse {
  metric: WidgetAnalyticsMetric
  period: WidgetAnalyticsQuery["period"]
  dimensions: WidgetAnalyticsDimension[]
  series: WidgetAnalyticsPoint[]
}
