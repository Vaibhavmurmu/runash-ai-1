"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type DashboardRealtimeChannel = "stream" | "chat" | "editor" | "store"

type DashboardRealtimeEvent = {
  type?: string
  at?: number
}

type UseDashboardRealtimeOptions = {
  onInvalidate?: (channel: DashboardRealtimeChannel, event: DashboardRealtimeEvent) => void
}

const REFRESH_CHANNELS: DashboardRealtimeChannel[] = ["stream", "chat", "editor", "store"]

export function useDashboardRealtime(options: UseDashboardRealtimeOptions = {}) {
  const { onInvalidate } = options
  const [connected, setConnected] = useState(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidateRef = useRef(onInvalidate)
  invalidateRef.current = onInvalidate

  const invalidationBudget = useRef<Record<DashboardRealtimeChannel, number>>({
    stream: 0,
    chat: 0,
    editor: 0,
    store: 0,
  })

  const invalidate = useMemo(
    () => (channel: DashboardRealtimeChannel, event: DashboardRealtimeEvent) => {
      const now = Date.now()
      const nextAllowedAt = invalidationBudget.current[channel]
      if (now < nextAllowedAt) return

      invalidationBudget.current[channel] = now + 1500
      invalidateRef.current?.(channel, event)
    },
    [],
  )

  useEffect(() => {
    let isClosed = false
    let source: EventSource | null = null

    const connect = () => {
      if (isClosed) return
      source = new EventSource("/api/dashboard/realtime")

      source.onopen = () => {
        setConnected(true)
      }

      source.onmessage = (rawEvent) => {
        let parsed: DashboardRealtimeEvent = {}
        try {
          parsed = JSON.parse(rawEvent.data) as DashboardRealtimeEvent
        } catch {
          return
        }

        const channel = parsed.type
        if (channel && REFRESH_CHANNELS.includes(channel as DashboardRealtimeChannel)) {
          invalidate(channel as DashboardRealtimeChannel, parsed)
        }
      }

      source.onerror = () => {
        setConnected(false)
        source?.close()
        source = null

        if (!isClosed) {
          reconnectTimerRef.current = setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      isClosed = true
      setConnected(false)
      source?.close()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [invalidate])

  return { connected }
}
