import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveLiveStreamSession,
  getStreamCommercialStats,
  listStreamProductReferences,
} from "@/lib/repositories/streams"
import { getLiveControlState } from "@/lib/repositories/stream-live-control"
import { listStreamSessionNetworkMetrics } from "@/lib/repositories/stream-session-network-metrics"

const FOLLOW_COOKIE_KEY = "runash-live-follow"

type LiveCurrentDependencies = {
  getActiveLiveStreamSession: typeof getActiveLiveStreamSession
  getLiveControlState: typeof getLiveControlState
  listStreamSessionNetworkMetrics: typeof listStreamSessionNetworkMetrics
  listStreamProductReferences: typeof listStreamProductReferences
  getStreamCommercialStats: typeof getStreamCommercialStats
}

const defaultDependencies: LiveCurrentDependencies = {
  getActiveLiveStreamSession,
  getLiveControlState,
  listStreamSessionNetworkMetrics,
  listStreamProductReferences,
  getStreamCommercialStats,
}

export async function handleGetCurrentLiveStream(request: NextRequest, deps: LiveCurrentDependencies = defaultDependencies) {
  const active = await deps.getActiveLiveStreamSession()

  if (!active) {
    return NextResponse.json({
      stream: null,
      stats: {
        streamId: null,
        viewerCount: 0,
        peakViewers: 0,
        totalViews: 0,
        chatMessages: 0,
        purchases: 0,
        revenue: 0,
        averageWatchTime: 0,
        engagementRate: 0,
      },
      follow: {
        isFollowing: false,
      },
    })
  }

  const isFollowing = request.cookies.get(FOLLOW_COOKIE_KEY)?.value === active.id

  const [networkSeries, liveControlState, dbFeaturedProducts, commercialStats] = await Promise.all([
    deps.listStreamSessionNetworkMetrics(active.id, 120),
    deps.getLiveControlState(active.userId, active.id).catch(() => null),
    deps.listStreamProductReferences(active.featuredProducts),
    deps.getStreamCommercialStats(active.id, active.totalRevenue),
  ])

  const latestNetwork = networkSeries.at(-1)
  const totalViews = Math.max(active.viewerCount, active.maxViewers)
  const engagementSignals = [latestNetwork?.reconnects ?? 0, latestNetwork?.droppedFrames ?? 0]
  const engagementPenalty = Math.min(0.2, engagementSignals.reduce((sum, value) => sum + value, 0) * 0.01)
  const engagementRate = Math.max(0, Number((0.75 - engagementPenalty).toFixed(2)))

  return NextResponse.json({
    stream: {
      id: active.id,
      title: active.title,
      description: active.description ?? "",
      hostId: active.userId,
      hostName: active.hostName,
      hostAvatar: active.hostAvatar ?? "",
      status: active.status,
      startTime: active.startTime ?? new Date().toISOString(),
      viewerCount: active.viewerCount,
      maxViewers: active.maxViewers,
      category: active.category ?? "General",
      tags: active.tags,
      thumbnailUrl: active.thumbnailUrl ?? "",
      streamUrl: active.streamUrl ?? "",
      featuredProducts: dbFeaturedProducts,
      totalSales: commercialStats.purchases,
      totalRevenue: commercialStats.revenue,
    },
    stats: {
      streamId: active.id,
      viewerCount: active.viewerCount,
      peakViewers: active.maxViewers,
      totalViews,
      chatMessages: liveControlState?.moderation.polls?.length ?? 0,
      purchases: commercialStats.purchases,
      revenue: commercialStats.revenue,
      averageWatchTime: 0,
      engagementRate,
      ...(latestNetwork
        ? {
            network: {
              health: latestNetwork.healthState,
              healthScore: latestNetwork.healthScore,
              sampledAt: latestNetwork.sampledAt.toISOString(),
            },
          }
        : {}),
    },
    follow: {
      isFollowing,
    },
  })
}

export async function GET(request: NextRequest) {
  return handleGetCurrentLiveStream(request)
}
