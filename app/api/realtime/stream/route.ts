import { realtimeGateway } from "@/services/realtime/gateway"
import { verifyRealtimeToken } from "@/services/realtime/auth"
import { publishCollaboratorPresence } from "@/services/realtime/publishers"
import type { RealtimeChannel, RealtimeEvent } from "@/services/realtime/types"

const encoder = new TextEncoder()

function frame(event: string, data: unknown, id?: string) {
  const idLine = id ? `id: ${id}\n` : ""
  return encoder.encode(`${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function channelProjectId(channel: RealtimeChannel): string | null {
  return channel.startsWith("editor:") ? channel.slice("editor:".length) : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const lastCursor = searchParams.get("cursor")

  if (!token) {
    return new Response(JSON.stringify({ error: "token is required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const session = verifyRealtimeToken(token)
  if (!session) {
    return new Response(JSON.stringify({ error: "Invalid realtime token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("retry: 2000\n\n"))
      const unsubscribers: Array<() => void> = []
      const presenceProjects = new Set<string>()
      let isClosed = false

      const close = () => {
        if (isClosed) return
        isClosed = true
        unsubscribers.forEach((fn) => fn())
        for (const projectId of presenceProjects) {
          publishCollaboratorPresence({ projectId, userId: session.userId, state: "leave" })
        }
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      const sendEvent = (event: RealtimeEvent) => {
        controller.enqueue(frame(event.type, event, event.cursor))
      }

      for (const channel of session.channels) {
        const replay = realtimeGateway.replay(channel, lastCursor)
        replay.forEach(sendEvent)

        unsubscribers.push(
          realtimeGateway.subscribe(channel, (event) => {
            if (isClosed) return
            sendEvent(event)
          }),
        )

        const projectId = channelProjectId(channel)
        if (projectId) {
          presenceProjects.add(projectId)
          publishCollaboratorPresence({ projectId, userId: session.userId, state: "join" })
        }
      }

      const heartbeat = setInterval(() => {
        if (isClosed) return
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
      }, 15000)

      unsubscribers.push(() => clearInterval(heartbeat))
      request.signal.addEventListener("abort", close)
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
