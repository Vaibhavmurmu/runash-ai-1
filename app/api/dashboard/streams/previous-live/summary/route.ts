import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../../utils"
import { fetchLatestCompletedStreamSummary } from "@/lib/repositories/stream-session-snapshots"
import type { LatestCompletedStreamSummaryResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const summary = await fetchLatestCompletedStreamSummary(scopedUserId)
  const payload: LatestCompletedStreamSummaryResponse = { summary }
  return NextResponse.json(payload)
}
