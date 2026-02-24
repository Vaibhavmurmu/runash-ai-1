"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type StreamingStudioStatus = "queued" | "scheduled" | "live" | "ended"

export type StreamingStudioEngagementCounters = {
  likes: number
  comments: number
  shares: number
  reactions: number
}

export type StreamingStudioAlertEvent = {
  streamId: string
  severity: "info" | "warning" | "critical"
  code: string
  message: string
  at: number
}

type StreamingStudioRealtimePayload =
  | {
      type: "ready"
      at: number
      streams: Array<{
        id: string
        status: StreamingStudioStatus
        concurrentViewers: number
        engagement: StreamingStudioEngagementCounters
      }>
    }
  | {
      type: "status_transition"
      at: number
      streamId: string
      from: StreamingStudioStatus
      to: StreamingStudioStatus
    }
  | {
      type: "viewers"
      at: number
      streamId: string
      concurrentViewers: number
    }
  | {
      type: "engagement"
      at: number
      streamId: string
      counters: Partial<StreamingStudioEngagementCounters>
    }
  | ({ type: "alert" } & StreamingStudioAlertEvent)

export type StreamingStudioRealtimeStreamState = {
  status: StreamingStudioStatus
  concurrentViewers: number
  engagement: StreamingStudioEngagementCounters
  lastUpdatedAt: number
}

type UseStreamingStudioRealtimeOptions = {
  initialStreamIds?: string[]
}

const INITIAL_ENGAGEMENT: StreamingStudioEngagementCounters = {
  likes: 0,
  comments: 0,
  shares: 0,
  reactions: 0,
}

export function useStreamingStudioRealtime(options: UseStreamingStudioRealtimeOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [streams, setStreams] = useState<Record<string, StreamingStudioRealtimeStreamState>>({})
  const [alerts, setAlerts] = useState<StreamingStudioAlertEvent[]>([])

  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourceRef = useRef<EventSource | null>(null)
  const subscribedStreamIdsRef = useRef(new Set(options.initialStreamIds ?? []))

  const applyEvent = useCallback((payload: StreamingStudioRealtimePayload) => {
    if (payload.type === "alert") {
      setAlerts((previous) => [payload, ...previous].slice(0, 20))
      return
    }

    if (payload.type === "ready") {
      setStreams(() => {
        const seeded = payload.streams.reduce<Record<string, StreamingStudioRealtimeStreamState>>((acc, stream) => {
          acc[stream.id] = {
            status: stream.status,
            concurrentViewers: stream.concurrentViewers,
            engagement: stream.engagement,
            lastUpdatedAt: payload.at,
          }
          return acc
        }, {})
        return seeded
      })
      return
    }

    setStreams((previous) => {
      const current = previous[payload.streamId] ?? {
        status: "scheduled",
        concurrentViewers: 0,
        engagement: INITIAL_ENGAGEMENT,
        lastUpdatedAt: payload.at,
      }

      if (payload.type === "status_transition") {
        return {
          ...previous,
          [payload.streamId]: {
            ...current,
            status: payload.to,
            lastUpdatedAt: payload.at,
          },
        }
      }

      if (payload.type === "viewers") {
        return {
          ...previous,
          [payload.streamId]: {
            ...current,
            concurrentViewers: payload.concurrentViewers,
            lastUpdatedAt: payload.at,
          },
        }
      }

      return {
        ...previous,
        [payload.streamId]: {
          ...current,
          engagement: {
            likes: payload.counters.likes ?? current.engagement.likes,
            comments: payload.counters.comments ?? current.engagement.comments,
            shares: payload.counters.shares ?? current.engagement.shares,
            reactions: payload.counters.reactions ?? current.engagement.reactions,
          },
          lastUpdatedAt: payload.at,
        },
      }
    })
  }, [])

  const connect = useCallback(() => {
    const ids = Array.from(subscribedStreamIdsRef.current)
    const params = new URLSearchParams()
    if (ids.length) {
      params.set("streamIds", ids.join(","))
    }

    const target = `/api/dashboard/streams/realtime${params.toString() ? `?${params.toString()}` : ""}`
    const source = new EventSource(target)
    sourceRef.current = source

    source.onopen = () => {
      reconnectAttemptRef.current = 0
      setConnected(true)
    }

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as StreamingStudioRealtimePayload
        applyEvent(parsed)
      } catch {
        // ignore malformed payloads
      }
    }

    source.onerror = () => {
      setConnected(false)
      source.close()
      sourceRef.current = null

      const backoffMs = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000)
      reconnectAttemptRef.current += 1
      reconnectTimerRef.current = setTimeout(() => {
        connect()
      }, backoffMs)
    }
  }, [applyEvent])

  useEffect(() => {
    connect()

    return () => {
      setConnected(false)
      sourceRef.current?.close()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [connect])

  const subscribe = useCallback((streamId: string) => {
    subscribedStreamIdsRef.current.add(streamId)
    sourceRef.current?.close()
    connect()
  }, [connect])

  const unsubscribe = useCallback((streamId: string) => {
    subscribedStreamIdsRef.current.delete(streamId)
    sourceRef.current?.close()
    connect()
  }, [connect])

  return useMemo(
    () => ({
      connected,
      streams,
      alerts,
      subscribe,
      unsubscribe,
    }),
    [alerts, connected, streams, subscribe, unsubscribe],
  )
}
