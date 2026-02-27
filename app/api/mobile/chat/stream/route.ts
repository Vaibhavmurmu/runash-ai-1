import { listMobileChatMessages } from "@/lib/repositories/mobile-app"

const encoder = new TextEncoder()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let cursor = searchParams.get("cursor") ?? new Date(0).toISOString()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const writeEvent = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, 15000)

      const poll = async () => {
        try {
          const response = await listMobileChatMessages(100, cursor)
          if (response.messages.length > 0) {
            cursor = response.cursor
            writeEvent(response)
          }
        } catch {
          writeEvent({ messages: [], cursor, error: "poll_failed" })
        }
      }

      void poll()
      const timer = setInterval(() => void poll(), 3000)

      request.signal.addEventListener("abort", () => {
        clearInterval(timer)
        clearInterval(heartbeat)
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

export const dynamic = "force-dynamic"
