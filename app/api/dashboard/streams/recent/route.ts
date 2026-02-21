import { type NextRequest, NextResponse } from "next/server"
import { listDashboardRecentStreams } from "@/lib/repositories/streams"
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils"
import type { DashboardRecentStreamsResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: NextRequest) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "6", 10)

  const streams = await listDashboardRecentStreams(scopedUserId, Number.isNaN(limit) ? 6 : limit)
  const payload: DashboardRecentStreamsResponse = {
    streams: streams.map((stream) => ({
      ...stream,
      url: stream.url || getCanonicalStreamUrl(stream.id),
      status: stream.status ?? "ended",
    })),
  }

  return NextResponse.json(payload)
}
