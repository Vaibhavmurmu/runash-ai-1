import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../../utils"
import { createFollowUpFromLatestSnapshot } from "@/lib/repositories/stream-session-snapshots"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const created = await createFollowUpFromLatestSnapshot(scopedUserId)
  if (!created) {
    return NextResponse.json({ error: "No completed stream snapshot found" }, { status: 404 })
  }

  return NextResponse.json(created)
}
