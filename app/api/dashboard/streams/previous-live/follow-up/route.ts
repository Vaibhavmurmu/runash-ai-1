import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireStreamDashboardUserId } from "../../utils"
import { createFollowUpFromLatestSnapshot } from "@/lib/repositories/stream-session-snapshots"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const created = await createFollowUpFromLatestSnapshot(scopedUserId)
  if (!created) {
    return respondError(request, { code: "STREAM_SNAPSHOT_NOT_FOUND", message: "No completed stream snapshot found" }, { status: 404, legacy: { error: "No completed stream snapshot found" } })
  }

  return respondSuccess(request, created, { legacy: created })
}
