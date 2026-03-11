import { NextResponse } from "next/server"
import { parseOptionalStreamId, parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"
import { getOverviewStats } from "@/lib/services/analytics-dashboard"

export async function GET(req: Request) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const url = new URL(req.url)
    const periodState = parsePeriod(url.searchParams)
    if (!periodState.ok) {
      return periodState.response
    }

    const streamState = parseOptionalStreamId(url.searchParams)
    if (!streamState.ok) {
      return streamState.response
    }

    const stats = await getOverviewStats({
      userId: sessionState.userId,
      period: periodState.period,
      streamId: streamState.streamId,
    })

    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
