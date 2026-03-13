import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../../../utils"
import { applyLiveControlAction } from "@/lib/repositories/stream-live-control"
import type { LiveControlAction } from "@/lib/types/stream-live-control"

export async function POST(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const body = (await request.json().catch(() => null)) as LiveControlAction | null
  if (!body?.type) {
    return NextResponse.json({ error: "Missing action type" }, { status: 400 })
  }

  try {
    const state = await applyLiveControlAction(scopedUserId, params.id, body)
    return NextResponse.json({ state })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to apply action" }, { status: 400 })
  }
}
