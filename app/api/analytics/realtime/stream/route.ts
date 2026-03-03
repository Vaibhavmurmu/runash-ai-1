import type { NextRequest } from "next/server"
import { getStreamRealtimeMetrics } from "@/lib/analytics/stream-realtime"
import { requireAnalyticsSession } from "@/app/api/analytics/_lib"

export async function GET(request: NextRequest) {
  const sessionState = await requireAnalyticsSession()
  if ("error" in sessionState) {
    return sessionState.error
  }

  const { searchParams } = new URL(request.url)
  const streamId = searchParams.get("streamId")

  if (!streamId) {
    return new Response("Missing streamId", { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const sendUpdate = async () => {
        const analyticsData = await getStreamRealtimeMetrics(streamId, sessionState.userId)

        const data = `data: ${JSON.stringify({
          totalViews: analyticsData.totalViews,
          currentViewers: analyticsData.currentViewers,
          peakViewers: analyticsData.peakViewers,
          averageViewers: analyticsData.averageViewers,
          watchTime: analyticsData.watchTime,
          chatMessages: analyticsData.chatMessages,
          newFollowers: analyticsData.newFollowers,
          donations: analyticsData.donations,
          engagement: analyticsData.engagement,
          streamHealth: analyticsData.streamHealth,
          revenue: analyticsData.revenue,
          subscriptions: analyticsData.subscriptions,
        })}\n\n`

        controller.enqueue(encoder.encode(data))
      }

      const interval = setInterval(() => {
        sendUpdate().catch(() => {
          controller.error(new Error("analytics_stream_failed"))
        })
      }, 5000)

      sendUpdate().catch(() => {
        clearInterval(interval)
        controller.error(new Error("analytics_stream_failed"))
      })

      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
