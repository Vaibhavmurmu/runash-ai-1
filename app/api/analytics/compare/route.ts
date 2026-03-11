import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"

export async function POST(req: NextRequest) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const body = (await req.json()) as { streamIds?: string[]; period?: string }
    const streamIds = Array.isArray(body.streamIds) ? body.streamIds.filter((id) => /^[a-zA-Z0-9_-]{1,64}$/.test(id)) : []
    if (streamIds.length === 0) {
      return NextResponse.json({ error: "streamIds must contain at least one stream id" }, { status: 400 })
    }

    const params = new URLSearchParams({ period: body.period ?? "7d" })
    const periodState = parsePeriod(params)
    if (!periodState.ok) {
      return periodState.response
    }

    const days = periodToDays(periodState.period)

    const placeholders = streamIds.map((_, index) => `$${index + 2}`).join(",")
    const streams = await Database.query<{
      stream_id: string
      title: string
      total_views: string | number | null
      peak_viewers: string | number | null
      average_viewers: string | number | null
      watch_time: string | number | null
      chat_messages: string | number | null
      new_followers: string | number | null
      donations: string | number | null
      engagement: string | number | null
    }>(
      `
      SELECT
        s.id::text AS stream_id,
        s.title,
        COALESCE(SUM(sa.total_views), 0) AS total_views,
        COALESCE(MAX(sa.peak_viewers), 0) AS peak_viewers,
        COALESCE(AVG(sa.average_viewers), 0) AS average_viewers,
        COALESCE(SUM(sa.watch_time), 0) AS watch_time,
        COALESCE(SUM(sa.chat_messages), 0) AS chat_messages,
        COALESCE(SUM(sa.new_followers), 0) AS new_followers,
        COALESCE(SUM(sa.donations), 0) AS donations,
        COALESCE(AVG(sa.engagement), 0) AS engagement
      FROM streams s
      LEFT JOIN stream_analytics sa ON sa.stream_id = s.id AND sa.created_at >= NOW() - INTERVAL '${days} days'
      WHERE s.user_id = $1
        AND s.id::text IN (${placeholders})
      GROUP BY s.id, s.title
      ORDER BY s.created_at DESC
    `,
      [sessionState.userId, ...streamIds],
    )

    const responseStreams = streams.map((stream) => ({
      streamId: stream.stream_id,
      title: stream.title,
      metrics: {
        totalViews: Number(stream.total_views ?? 0),
        currentViewers: 0,
        peakViewers: Number(stream.peak_viewers ?? 0),
        averageViewers: Math.round(Number(stream.average_viewers ?? 0)),
        watchTime: Number(stream.watch_time ?? 0),
        chatMessages: Number(stream.chat_messages ?? 0),
        newFollowers: Number(stream.new_followers ?? 0),
        donations: Number(stream.donations ?? 0),
        engagement: Number(stream.engagement ?? 0),
        streamHealth: "Good" as const,
        revenue: Number(stream.donations ?? 0),
        subscriptions: 0,
      },
    }))

    const comparisonMetrics = [
      { metric: "totalViews", selector: (item: (typeof responseStreams)[number]) => item.metrics.totalViews },
      { metric: "revenue", selector: (item: (typeof responseStreams)[number]) => item.metrics.revenue },
      { metric: "engagement", selector: (item: (typeof responseStreams)[number]) => item.metrics.engagement },
    ]

    return NextResponse.json({
      streams: responseStreams,
      comparison: comparisonMetrics.map((metric) => ({
        metric: metric.metric,
        values: responseStreams.map((stream) => ({ streamId: stream.streamId, value: metric.selector(stream) })),
      })),
    })
  } catch (error) {
    console.error("Comparative analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function periodToDays(period: "24h" | "7d" | "30d" | "90d" | "1y") {
  switch (period) {
    case "24h":
      return 1
    case "30d":
      return 30
    case "90d":
      return 90
    case "1y":
      return 365
    case "7d":
    default:
      return 7
  }
}
