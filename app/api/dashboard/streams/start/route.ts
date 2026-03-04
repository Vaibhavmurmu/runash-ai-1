import { v4 as uuidv4 } from "uuid"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { createDashboardLiveStream } from "@/lib/repositories/streams"
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils"
import type { DashboardRecentStream, StartStreamRequest, StartStreamResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request.json().catch(() => null)) as StartStreamRequest | null

  if (!body?.title?.trim()) {
    return respondError(request, { code: "INVALID_STREAM_START_REQUEST", message: "Missing title" }, { status: 400, legacy: { error: "Missing title" } })
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

  return respondSuccess(request, payload, { status: 201, legacy: payload })
}
