import { respondError, respondSuccess } from "@/lib/api/envelope"
import { listDashboardRecentStreams, listDashboardScheduledStreams } from "@/lib/repositories/streams"
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils"
import type { DashboardStreamDetailsResponse } from "@/lib/types/dashboard-streams"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const { id } = await params

  const [recent, scheduled] = await Promise.all([
    listDashboardRecentStreams(scopedUserId, 200),
    listDashboardScheduledStreams(scopedUserId),
  ])

  const recentStream = recent.find((stream) => stream.id === id)
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

  const scheduledStream = scheduled.find((stream) => stream.id === params.id)
  if (scheduledStream) {
    const payload: DashboardStreamDetailsResponse = {
      stream: {
        id: scheduledStream.id,
        title: scheduledStream.title,
        category: scheduledStream.category,
        status: scheduledStream.status ?? "scheduled",
        url: scheduledStream.url || getCanonicalStreamUrl(scheduledStream.id),
        startsAt: scheduledStream.startsAt,
      },
    }

    return respondSuccess(request, payload, { legacy: payload })
  }

  return respondError(request, { code: "STREAM_NOT_FOUND", message: "Stream not found" }, { status: 404, legacy: { error: "Stream not found" } })
}
