import { type NextRequest, NextResponse } from "next/server"
import { listDashboardRecentStreams } from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "./utils"
import type { DashboardRecentStreamsResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: NextRequest) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "6", 10)

  const recentStreams = await listDashboardRecentStreams(scopedUserId, Number.isNaN(limit) ? 6 : limit)
  const payload: DashboardRecentStreamsResponse = { streams: recentStreams }

  return NextResponse.json(payload)
}
