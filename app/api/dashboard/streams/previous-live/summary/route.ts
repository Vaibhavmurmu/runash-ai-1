import { respondSuccess } from "@/lib/api/envelope"
import { requireStreamDashboardUserId } from "../../utils"
import { fetchLatestCompletedStreamSummary } from "@/lib/repositories/stream-session-snapshots"
import type { LatestCompletedStreamSummaryResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const summary = await fetchLatestCompletedStreamSummary(scopedUserId)
  const payload: LatestCompletedStreamSummaryResponse = { summary }
  return respondSuccess(request, payload, { legacy: payload })
}
