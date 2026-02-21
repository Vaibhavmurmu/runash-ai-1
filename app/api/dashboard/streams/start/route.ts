import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { createDashboardLiveStream } from "@/lib/repositories/streams"
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils"
import type { DashboardRecentStream, StartStreamRequest, StartStreamResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const body = (await request.json().catch(() => null)) as StartStreamRequest | null

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 })
  }

  const id = uuidv4()
  const startedAt = new Date().toISOString()
  const url = getCanonicalStreamUrl(id)

  const newStream: DashboardRecentStream = {
    id,
    title: body.title.trim(),
    category: body.category,
    date: startedAt,
    viewers: 0,
    duration: null,
    url,
    status: "live",
  }

  await createDashboardLiveStream(scopedUserId, newStream)

  const payload: StartStreamResponse = {
    id,
    title: newStream.title,
    category: newStream.category,
    url,
    status: "live",
    startedAt,
  }

  return NextResponse.json(payload, { status: 201 })
}
