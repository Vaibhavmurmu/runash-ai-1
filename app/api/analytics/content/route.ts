import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

function getPeriodDays(period: string): number {
  switch (period) {
    case "1d":
      return 1
    case "7d":
      return 7
    case "30d":
      return 30
    case "90d":
      return 90
    case "1y":
      return 365
    default:
      return 7
  }
}

function parseCsv(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "7d"
    const streamId = searchParams.get("streamId")
    const platforms = parseCsv(searchParams.get("platforms"))
    const categories = parseCsv(searchParams.get("categories")).map((value) => value.toLowerCase())
    const streamTypes = parseCsv(searchParams.get("streamTypes"))

    const days = getPeriodDays(period)
    const userId = session.user.id

    const conditions: string[] = ["s.user_id = $1", `s.created_at >= NOW() - INTERVAL '${days} days'`]
    const params: unknown[] = [userId]

    if (streamId) {
      params.push(streamId)
      conditions.push(`s.id::text = $${params.length}`)
    }

    if (platforms.length > 0) {
      params.push(platforms)
      conditions.push(`s.platform = ANY($${params.length})`)
    }

    if (streamTypes.length > 0) {
      params.push(streamTypes)
      conditions.push(`s.status = ANY($${params.length})`)
    }

    if (categories.length > 0) {
      params.push(categories)
      conditions.push(`LOWER(s.platform) = ANY($${params.length})`)
    }

    const whereClause = conditions.join(" AND ")

    const topClips = await Database.query(
      `
      SELECT
        r.id::text as id,
        COALESCE(NULLIF(r.title, ''), CONCAT('Clip ', r.id::text)) as title,
        COALESCE(r.view_count, 0)::int as views,
        0::int as shares,
        COALESCE(r.duration, 0)::int as duration,
        r.thumbnail_url as "thumbnailUrl"
      FROM recordings r
      JOIN streams s ON s.id = r.stream_id
      WHERE ${whereClause}
      ORDER BY COALESCE(r.view_count, 0) DESC, r.created_at DESC
      LIMIT 5
    `,
      params,
    )

    const topMoments = await Database.query(
      `
      SELECT
        sa.created_at as timestamp,
        CONCAT('Peak engagement on ', TO_CHAR(sa.created_at, 'Mon DD')) as title,
        COALESCE(sa.average_viewers, 0)::int as "viewerSpike",
        COALESCE(sa.chat_messages, 0)::int as "chatSpike"
      FROM stream_analytics sa
      JOIN streams s ON s.id = sa.stream_id
      WHERE ${whereClause}
      ORDER BY COALESCE(sa.engagement, 0) DESC, COALESCE(sa.chat_messages, 0) DESC, sa.created_at DESC
      LIMIT 5
    `,
      params,
    )

    const categoryPerformance = await Database.query(
      `
      SELECT
        COALESCE(NULLIF(s.platform, ''), 'uncategorized') as category,
        COALESCE(ROUND(AVG(COALESCE(sa.average_viewers, s.viewer_count, 0))), 0)::int as "avgViewers",
        COALESCE(ROUND(AVG(COALESCE(sa.engagement, 0))::numeric, 1), 0)::float as "avgEngagement",
        COUNT(DISTINCT s.id)::int as streams
      FROM streams s
      LEFT JOIN stream_analytics sa ON sa.stream_id = s.id
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY streams DESC, category ASC
    `,
      params,
    )

    return NextResponse.json({ topClips, topMoments, categoryPerformance })
  } catch (error) {
    console.error("Content analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
