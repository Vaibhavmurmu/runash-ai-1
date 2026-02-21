import { type NextRequest } from "next/server"
import { getStreamRealtimeMetrics } from "@/lib/analytics/stream-realtime"
import { getServerAuthSession } from "@/lib/auth/session"

export const runtime = "nodejs"

type MetricsEntry = {
  streamId: string
  viewerCount: number
  bitrate: number
  fps: number
  droppedFrames: number
  timestamp: string
}

function toSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const streamIds = (searchParams.get("streamIds") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  if (streamIds.length === 0) {
    return new Response("streamIds required", { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false

      const emitMetrics = async () => {
        try {
          const entries = await Promise.all(
            streamIds.map(async (streamId): Promise<MetricsEntry> => {
              const metrics = await getStreamRealtimeMetrics(streamId, session.user.id)
              return {
                streamId,
                viewerCount: metrics.currentViewers,
                bitrate: metrics.bitrate,
                fps: metrics.fps,
                droppedFrames: metrics.droppedFrames,
                timestamp: metrics.timestamp,
              }
            }),
          )

          if (!closed) {
            controller.enqueue(encoder.encode(toSse("metrics", { entries })))
          }
        } catch {
          if (!closed) {
            controller.enqueue(
              encoder.encode(toSse("error", { message: "Unable to fetch stream metrics", timestamp: new Date().toISOString() })),
            )
          }
        }
      }

      controller.enqueue(encoder.encode(toSse("ready", { streamIds, timestamp: new Date().toISOString() })))
      void emitMetrics()

      const metricsTimer = setInterval(() => {
        void emitMetrics()
      }, 5000)

      const keepAliveTimer = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": ping\n\n"))
        }
      }, 15000)

      request.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(metricsTimer)
        clearInterval(keepAliveTimer)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
