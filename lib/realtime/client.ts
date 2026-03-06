import type { RealtimeEvent, RealtimeEventType } from "@/services/realtime/types"

type SubscriberOptions = {
  channels: string[]
  cursor?: string | null
  onEvent: (event: RealtimeEvent) => void
  onError?: () => void
}

export async function connectRealtimeSubscriber(options: SubscriberOptions): Promise<() => void> {
  const handshake = await fetch("/api/realtime/handshake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channels: options.channels }),
  })

  if (!handshake.ok) {
    throw new Error("Realtime handshake failed")
  }

  const handshakeJson = (await handshake.json()) as { token: string; channels: string[] }
  const params = new URLSearchParams({ token: handshakeJson.token })
  if (options.cursor) params.set("cursor", options.cursor)

  const source = new EventSource(`/api/realtime/stream?${params.toString()}`)
  const handlers = new Map<RealtimeEventType, EventListener>()

  const attach = (type: RealtimeEventType) => {
    const listener: EventListener = (raw) => {
      const message = raw as MessageEvent<string>
      try {
        const parsed = JSON.parse(message.data) as RealtimeEvent
        options.onEvent(parsed)
      } catch {
        // drop malformed frames
      }
    }

    handlers.set(type, listener)
    source.addEventListener(type, listener)
  }

  attach("session.state_changed")
  attach("render_job.updated")
  attach("timeline.mutated")
  attach("timeline.lock_changed")
  attach("collaborator.presence")

  source.onerror = () => {
    options.onError?.()
    source.close()
  }

  return () => {
    handlers.forEach((listener, type) => source.removeEventListener(type, listener))
    source.close()
  }
}
