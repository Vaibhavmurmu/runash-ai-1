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

  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE headers
      const response = new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      })

      // Add connection to manager
      emailRealtimeManager.addConnection(connectionId, response)

      // Send initial connection message
      const encoder = new TextEncoder()
      const initialMessage = encoder.encode(
        `data: ${JSON.stringify({
          type: "connected",
          connectionId,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      )

      controller.enqueue(initialMessage)

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          const pingMessage = encoder.encode(
            `data: ${JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          )
          controller.enqueue(pingMessage)
        } catch (error) {
          console.error("Error sending ping:", error)
          clearInterval(pingInterval)
          emailRealtimeManager.removeConnection(connectionId)
          controller.close()
        }
      }, 30000) // Ping every 30 seconds

      // Handle connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval)
        emailRealtimeManager.removeConnection(connectionId)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
