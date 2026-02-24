import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../../utils"
import { fetchRestorableStreamDraft } from "@/lib/repositories/stream-session-snapshots"
import type { RestoreLastStreamDraftResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const draft = await fetchRestorableStreamDraft(scopedUserId)
  const payload: RestoreLastStreamDraftResponse = { draft }
  return NextResponse.json(payload)
}
