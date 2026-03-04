import type { NextRequest } from "next/server"
import { emailRealtimeManager } from "@/lib/email-realtime"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerAuthSession()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Check if user has admin permissions
  // You can add more specific permission checks here
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    return new Response("Forbidden", { status: 403 })
  }

  // Create SSE connection
  const connectionId = `${session.user.id}-${Date.now()}`
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  let isClosed = false

  const unregisterConnection = async (reason: "abort" | "close" | "error") => {
    if (isClosed) {
      return
    }

    isClosed = true
    clearInterval(pingInterval)
    await emailRealtimeManager.removeConnection(connectionId, { closeWriter: reason !== "close" })

    console.info("[email-realtime] SSE connection cleanup", {
      connectionId,
      reason,
    })
  }

  emailRealtimeManager.addConnection(connectionId, writer)

  await writer.ready
  await writer.write(
    encoder.encode(
      `data: ${JSON.stringify({
        type: "connected",
        connectionId,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    ),
  )

  const pingInterval = setInterval(() => {
    void (async () => {
      if (isClosed) {
        return
      }

      try {
        await writer.ready
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        )
      } catch (error) {
        console.warn("[email-realtime] SSE ping failed", {
          connectionId,
          error: error instanceof Error ? error.message : "unknown",
        })
        await unregisterConnection("error")
      }
    })()
  }, 30000) // Ping every 30 seconds

  request.signal.addEventListener("abort", () => {
    void unregisterConnection("abort")
  })

  void writer.closed.finally(() => {
    void unregisterConnection("close")
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
