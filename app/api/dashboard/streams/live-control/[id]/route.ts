import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../../utils"
import { getLiveControlState, upsertLiveControlState } from "@/lib/repositories/stream-live-control"
import type { LiveControlState } from "@/lib/types/stream-live-control"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  try {
    const state = await getLiveControlState(scopedUserId, params.id)
    return NextResponse.json({ state })
  } catch {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const body = (await request.json().catch(() => null)) as Partial<LiveControlState> | null
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const state = await upsertLiveControlState(scopedUserId, params.id, body)
    return NextResponse.json({ state })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update live control" }, { status: 400 })
  }
}
