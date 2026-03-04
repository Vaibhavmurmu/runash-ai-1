import { requireDashboardSessionUserId } from "../_auth"

const HEARTBEAT_INTERVAL_MS = 15000
const CHANNEL_INTERVALS_MS: Record<string, number> = {
  stream: 5000,
  chat: 7000,
  editor: 9000,
  store: 11000,
}

export async function GET(request: Request) {
  const scopedUserId = await requireDashboardSessionUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const encoder = new TextEncoder()
  const activeChannels = Object.keys(CHANNEL_INTERVALS_MS)

  const stream = new ReadableStream({
    start(controller) {
      const emit = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      emit({ type: "ready", channels: activeChannels, at: Date.now() })

      const timers = activeChannels.map((channel) =>
        setInterval(() => {
          emit({ type: channel, at: Date.now() })
        }, CHANNEL_INTERVALS_MS[channel]),
      )

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, HEARTBEAT_INTERVAL_MS)

      request.signal.addEventListener("abort", () => {
        timers.forEach(clearInterval)
        clearInterval(heartbeat)
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

export const dynamic = "force-dynamic"
