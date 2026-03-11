import { type NextRequest, NextResponse } from "next/server"
import { parseOptionalStreamId, parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"
import { getHistoricalSeries } from "@/lib/services/analytics-dashboard"

export async function GET(req: NextRequest) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const { searchParams } = new URL(req.url)
    const periodState = parsePeriod(searchParams)
    if (!periodState.ok) {
      return periodState.response
    }

    const streamState = parseOptionalStreamId(searchParams)
    if (!streamState.ok) {
      return streamState.response
    }

    const data = await getHistoricalSeries({
      userId: sessionState.userId,
      period: periodState.period,
      streamId: streamState.streamId,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Historical analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
