import type { NextRequest } from "next/server"
import { getPollQuizzes } from "@/lib/poll-quiz"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let lastSignature = ""

      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000)

      const publish = () => {
        const items = getPollQuizzes(params.id)
        const signature = JSON.stringify(
          items.map((item) => ({
            id: item.id,
            status: item.status,
            votes: item.options.map((option) => option.votes),
          })),
        )

        if (signature !== lastSignature) {
          lastSignature = signature
          send({ type: "polls", data: items })
        }
      }

      const timer = setInterval(publish, 1000)
      publish()

      req.signal.addEventListener("abort", () => {
        clearInterval(timer)
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
