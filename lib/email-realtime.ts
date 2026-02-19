import { EventEmitter } from "events"

export interface EmailEvent {
  type: "delivery_status" | "bounce" | "complaint" | "open" | "click" | "unsubscribe" | "broadcast_progress"
  messageId: string
  email: string
  timestamp: Date
  data?: any
}

export interface RealtimeEmailMetrics {
  totalSent: number
  totalDelivered: number
  totalBounced: number
  totalOpened: number
  totalClicked: number
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  recentEvents: EmailEvent[]
}

interface RealtimeConnection {
  writer: WritableStreamDefaultWriter<Uint8Array>
  closed: boolean
}

class EmailRealtimeManager extends EventEmitter {
  private static instance: EmailRealtimeManager
  private connections: Map<string, RealtimeConnection> = new Map()
  private encoder = new TextEncoder()
  private metrics: RealtimeEmailMetrics = {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalOpened: 0,
    totalClicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    recentEvents: [],
  }

  static getInstance(): EmailRealtimeManager {
    if (!EmailRealtimeManager.instance) {
      EmailRealtimeManager.instance = new EmailRealtimeManager()
    }
    return EmailRealtimeManager.instance
  }

  // Add SSE connection
  addConnection(connectionId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
    this.connections.set(connectionId, { writer, closed: false })
    console.info("[email-realtime] connection registered", {
      connectionId,
      activeConnections: this.connections.size,
    })

    // Send initial metrics
    void this.sendToConnection(connectionId, {
      type: "metrics",
      data: this.metrics,
    })
  }

  // Remove SSE connection
  async removeConnection(connectionId: string, options?: { closeWriter?: boolean }) {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return
    }

    this.connections.delete(connectionId)
    connection.closed = true

    if (options?.closeWriter !== false) {
      try {
        await connection.writer.close()
      } catch {
        // Writer can already be closed/cancelled by runtime.
      }
    }

    console.info("[email-realtime] connection unregistered", {
      connectionId,
      activeConnections: this.connections.size,
    })
  }

  // Broadcast event to all connections
  broadcastEvent(event: EmailEvent) {
    // Add to recent events
    this.metrics.recentEvents.unshift(event)
    if (this.metrics.recentEvents.length > 50) {
      this.metrics.recentEvents = this.metrics.recentEvents.slice(0, 50)
    }

    // Update metrics based on event type
    this.updateMetrics(event)

    console.info("[email-realtime] broadcasting event", {
      eventType: event.type,
      activeConnections: this.connections.size,
    })

    // Broadcast to all connections
    const message = {
      type: "event",
      data: event,
    }

    for (const connectionId of this.connections.keys()) {
      void this.sendToConnection(connectionId, message)
    }

    // Also broadcast updated metrics
    setTimeout(() => {
      this.broadcastMetrics()
    }, 100)
  }

  // Broadcast current metrics
  broadcastMetrics() {
    const message = {
      type: "metrics",
      data: this.metrics,
    }

    for (const connectionId of this.connections.keys()) {
      void this.sendToConnection(connectionId, message)
    }
  }

  // Send message to specific connection
  private async sendToConnection(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.closed) {
      return
    }

    try {
      const payload = this.encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
      await connection.writer.ready
      await connection.writer.write(payload)
    } catch (error) {
      console.warn("[email-realtime] failed to send SSE payload", {
        connectionId,
        activeConnections: this.connections.size,
        error: error instanceof Error ? error.message : "unknown",
      })
      await this.removeConnection(connectionId, { closeWriter: false })
    }
  }

  // Update metrics based on event
  private updateMetrics(event: EmailEvent) {
    switch (event.type) {
      case "delivery_status":
        if (event.data?.status === "sent") {
          this.metrics.totalSent++
        } else if (event.data?.status === "delivered") {
          this.metrics.totalDelivered++
        }
        break
      case "bounce":
        this.metrics.totalBounced++
        break
      case "open":
        this.metrics.totalOpened++
        break
      case "click":
        this.metrics.totalClicked++
        break
    }

    // Recalculate rates
    if (this.metrics.totalSent > 0) {
      this.metrics.deliveryRate = (this.metrics.totalDelivered / this.metrics.totalSent) * 100
      this.metrics.bounceRate = (this.metrics.totalBounced / this.metrics.totalSent) * 100
    }

    if (this.metrics.totalDelivered > 0) {
      this.metrics.openRate = (this.metrics.totalOpened / this.metrics.totalDelivered) * 100
    }

    if (this.metrics.totalOpened > 0) {
      this.metrics.clickRate = (this.metrics.totalClicked / this.metrics.totalOpened) * 100
    }
  }

  // Get current metrics
  getMetrics(): RealtimeEmailMetrics {
    return { ...this.metrics }
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalOpened: 0,
      totalClicked: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      recentEvents: [],
    }
    this.broadcastMetrics()
  }
}

export const emailRealtimeManager = EmailRealtimeManager.getInstance()

// Helper functions for triggering events
export function triggerEmailEvent(event: EmailEvent) {
  emailRealtimeManager.broadcastEvent(event)
}

export function triggerDeliveryStatusEvent(messageId: string, email: string, status: string, data?: any) {
  triggerEmailEvent({
    type: "delivery_status",
    messageId,
    email,
    timestamp: new Date(),
    data: { status, ...data },
  })
}

export function triggerBounceEvent(messageId: string, email: string, bounceType: string, reason?: string) {
  triggerEmailEvent({
    type: "bounce",
    messageId,
    email,
    timestamp: new Date(),
    data: { bounceType, reason },
  })
}

export function triggerOpenEvent(messageId: string, email: string, userAgent?: string, ipAddress?: string) {
  triggerEmailEvent({
    type: "open",
    messageId,
    email,
    timestamp: new Date(),
    data: { userAgent, ipAddress },
  })
}

export function triggerClickEvent(messageId: string, email: string, url: string, userAgent?: string) {
  triggerEmailEvent({
    type: "click",
    messageId,
    email,
    timestamp: new Date(),
    data: { url, userAgent },
  })
}

export function triggerBroadcastProgressEvent(data: {
  broadcastId: number
  status: "queued" | "sending" | "retrying" | "sent" | "failed"
  sentCount: number
  failedCount: number
  totalRecipients: number
  message?: string
}) {
  triggerEmailEvent({
    type: "broadcast_progress",
    messageId: `broadcast-${data.broadcastId}`,
    email: "broadcast",
    timestamp: new Date(),
    data,
  })
}
