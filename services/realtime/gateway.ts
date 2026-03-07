import { EventEmitter } from "node:events"
import type { RealtimeChannel, RealtimeEvent, RealtimeEventPayloadMap, RealtimeEventType } from "@/services/realtime/types"

type StoredEvent = RealtimeEvent & { sequence: number }

const MAX_EVENTS_PER_CHANNEL = 200

class RealtimeGateway {
  private readonly emitter = new EventEmitter()
  private readonly events = new Map<RealtimeChannel, StoredEvent[]>()
  private sequence = 0

  publish<T extends RealtimeEventType>(input: {
    channel: RealtimeChannel
    type: T
    payload: RealtimeEventPayloadMap[T]
    sentAt?: string
  }): RealtimeEvent<T> {
    this.sequence += 1
    const cursor = String(this.sequence)
    const event: StoredEvent = {
      schemaVersion: "1.0",
      cursor,
      channel: input.channel,
      type: input.type,
      sentAt: input.sentAt ?? new Date().toISOString(),
      payload: input.payload,
      sequence: this.sequence,
    }

    const history = this.events.get(input.channel) ?? []
    history.push(event)
    if (history.length > MAX_EVENTS_PER_CHANNEL) {
      history.splice(0, history.length - MAX_EVENTS_PER_CHANNEL)
    }
    this.events.set(input.channel, history)

    this.emitter.emit(this.channelEvent(input.channel), event)
    return event
  }

  subscribe(channel: RealtimeChannel, onEvent: (event: RealtimeEvent) => void): () => void {
    const eventName = this.channelEvent(channel)
    this.emitter.on(eventName, onEvent)
    return () => {
      this.emitter.off(eventName, onEvent)
    }
  }

  replay(channel: RealtimeChannel, afterCursor: string | null): RealtimeEvent[] {
    const history = this.events.get(channel) ?? []
    if (!afterCursor) return history
    const parsed = Number(afterCursor)
    if (!Number.isFinite(parsed)) return history
    return history.filter((event) => event.sequence > parsed)
  }

  private channelEvent(channel: RealtimeChannel) {
    return `channel:${channel}`
  }
}

const globalStore = globalThis as typeof globalThis & {
  __runashRealtimeGateway?: RealtimeGateway
}

export const realtimeGateway = globalStore.__runashRealtimeGateway ?? new RealtimeGateway()
globalStore.__runashRealtimeGateway = realtimeGateway
