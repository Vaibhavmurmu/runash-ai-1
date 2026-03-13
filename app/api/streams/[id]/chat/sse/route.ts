import type { NextRequest } from "next/server"
import { getMessages } from "@/lib/chat"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const streamId = params.id
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let lastTs = 0
      function send(event: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      // heartbeat
      const hb = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000)

      // simple polling loop
      const poll = async () => {
        try {
          const msgs = await getMessages(streamId, 200)
          const fresh = msgs.filter((m) => m.createdAt > lastTs)
          if (fresh.length) {
            lastTs = Math.max(...fresh.map((m) => m.createdAt))
            send({ type: "messages", data: fresh })
          }
        } catch {}
      }

      let alive = true
      const iv = setInterval(poll, 1000)
      req.signal.addEventListener("abort", () => {
        alive = false
        clearInterval(iv)
        clearInterval(hb)
        controller.close()
      })

      // initial snapshot
      await poll()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export const dynamic = "force-dynamic"
