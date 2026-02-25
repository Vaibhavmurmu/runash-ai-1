import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getCanonicalStreamUrl, readData, requireStreamDashboardUserId } from "../utils"
import type { DashboardStreamDetailsResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const data = await readData(scopedUserId)

  const recentStream = data.recent.find((stream) => stream.id === params.id)
  if (recentStream) {
    const payload: DashboardStreamDetailsResponse = {
      stream: {
        id: recentStream.id,
        title: recentStream.title,
        category: recentStream.category,
        status: recentStream.status ?? "ended",
        url: recentStream.url || getCanonicalStreamUrl(recentStream.id),
        startedAt: recentStream.date,
        viewers: recentStream.viewers,
        duration: recentStream.duration,
      },
    }

    return respondSuccess(request, payload, { legacy: payload })
  }

  const scheduledStream = data.scheduled.find((stream) => stream.id === params.id)
  if (scheduledStream) {
    const startsAt = scheduledStream.startsAt ?? (scheduledStream as { dateTime?: string }).dateTime

    const payload: DashboardStreamDetailsResponse = {
      stream: {
        id: scheduledStream.id,
        title: scheduledStream.title,
        category: scheduledStream.category,
        status: scheduledStream.status ?? "scheduled",
        url: scheduledStream.url || getCanonicalStreamUrl(scheduledStream.id),
        startsAt,
      },
    }

    return respondSuccess(request, payload, { legacy: payload })
  }

  return respondError(request, { code: "STREAM_NOT_FOUND", message: "Stream not found" }, { status: 404, legacy: { error: "Stream not found" } })
}
