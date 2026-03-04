"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type RealtimeModuleChannel = "streams" | "alerts" | "chat" | "automation" | "editor-jobs"

export type RealtimeEventEnvelope<TPayload = unknown> = {
  channel: RealtimeModuleChannel
  type: string
  payload: TPayload
  occurredAt: number
  requestId: string
}

type RealtimeConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "stale" | "closed"
type RealtimeTransport = "sse" | "websocket"

type RealtimeConnectionMeta = {
  requestId: string
  attempt: number
  transport: RealtimeTransport
}

type UseRealtimeClientOptions = {
  endpoint: string
  channels: RealtimeModuleChannel[]
  mode?: "sse" | "websocket" | "auto"
  staleAfterMs?: number
  maxBackoffMs?: number
  onEvent: (event: RealtimeEventEnvelope) => void
  onStale?: (meta: RealtimeConnectionMeta) => Promise<void> | void
}

type RealtimeClientState = {
  connected: boolean
  status: RealtimeConnectionStatus
  transport: RealtimeTransport
  requestId: string
  reconnectAttempt: number
  lastEventAt: number | null
  lastError: string | null
}

const DEFAULT_STALE_AFTER_MS = 20_000
const DEFAULT_MAX_BACKOFF_MS = 15_000

function createRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function resolveWebSocketUrl(baseEndpoint: string, requestId: string, channels: RealtimeModuleChannel[]) {
  const sourceUrl = new URL(baseEndpoint, window.location.origin)
  sourceUrl.protocol = sourceUrl.protocol === "https:" ? "wss:" : "ws:"
  sourceUrl.searchParams.set("requestId", requestId)
  sourceUrl.searchParams.set("channels", channels.join(","))
  return sourceUrl.toString()
}

function resolveSseUrl(baseEndpoint: string, requestId: string, channels: RealtimeModuleChannel[]) {
  const sourceUrl = new URL(baseEndpoint, window.location.origin)
  sourceUrl.searchParams.set("requestId", requestId)
  sourceUrl.searchParams.set("channels", channels.join(","))
  return sourceUrl.toString()
}

export function useRealtimeClient(options: UseRealtimeClientOptions): RealtimeClientState {
  const {
    endpoint,
    channels,
    mode = "auto",
    staleAfterMs = DEFAULT_STALE_AFTER_MS,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    onEvent,
    onStale,
  } = options

  const channelsKey = useMemo(() => channels.join("|"), [channels])
  const requestIdRef = useRef(createRequestId("rt"))
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastEventAtRef = useRef<number | null>(null)
  const hasDispatchedStaleRef = useRef(false)
  const transportRef = useRef<RealtimeTransport>(mode === "sse" ? "sse" : "websocket")

  const onEventRef = useRef(onEvent)
  const onStaleRef = useRef(onStale)
  onEventRef.current = onEvent
  onStaleRef.current = onStale

  const [state, setState] = useState<RealtimeClientState>({
    connected: false,
    status: "idle",
    transport: transportRef.current,
    requestId: requestIdRef.current,
    reconnectAttempt: 0,
    lastEventAt: null,
    lastError: null,
  })

  const markTransport = useCallback((transport: RealtimeTransport) => {
    transportRef.current = transport
    setState((previous) => ({
      ...previous,
      transport,
    }))
  }, [])

  const handleIncomingEvent = useCallback((incoming: string) => {
    try {
      const parsed = JSON.parse(incoming) as Partial<RealtimeEventEnvelope>
      if (!parsed.channel || !parsed.type) return

      const event: RealtimeEventEnvelope = {
        channel: parsed.channel,
        type: parsed.type,
        payload: parsed.payload,
        occurredAt: parsed.occurredAt ?? Date.now(),
        requestId: parsed.requestId ?? requestIdRef.current,
      }

      lastEventAtRef.current = Date.now()
      hasDispatchedStaleRef.current = false
      setState((previous) => ({
        ...previous,
        connected: true,
        status: "connected",
        lastError: null,
        lastEventAt: lastEventAtRef.current,
      }))
      onEventRef.current(event)
    } catch {
      setState((previous) => ({
        ...previous,
        lastError: "Malformed realtime payload",
      }))
    }
  }, [])

  useEffect(() => {
    let unmounted = false
    let socket: WebSocket | null = null
    let source: EventSource | null = null

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const disconnect = () => {
      socket?.close()
      source?.close()
      socket = null
      source = null
    }

    const scheduleReconnect = (transport: RealtimeTransport, reason: string) => {
      clearReconnect()
      disconnect()

      reconnectAttemptRef.current += 1
      const baseDelay = Math.min(1000 * 2 ** (reconnectAttemptRef.current - 1), maxBackoffMs)
      const delayMs = baseDelay + Math.round(Math.random() * 350)

      markTransport(transport)
      setState((previous) => ({
        ...previous,
        connected: false,
        status: "reconnecting",
        reconnectAttempt: reconnectAttemptRef.current,
        lastError: reason,
      }))

      reconnectTimerRef.current = setTimeout(() => {
        if (unmounted) return
        connect()
      }, delayMs)
    }

    const connectViaSse = () => {
      const target = resolveSseUrl(endpoint, requestIdRef.current, channels)
      markTransport("sse")
      setState((previous) => ({
        ...previous,
        status: reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting",
      }))

      source = new EventSource(target)
      source.onopen = () => {
        reconnectAttemptRef.current = 0
        setState((previous) => ({
          ...previous,
          connected: true,
          status: "connected",
          reconnectAttempt: 0,
          lastError: null,
        }))
      }
      source.onmessage = (event) => handleIncomingEvent(event.data)
      source.onerror = () => scheduleReconnect("sse", "SSE disconnected")
    }

    const connectViaWebSocket = () => {
      const target = resolveWebSocketUrl(endpoint, requestIdRef.current, channels)
      markTransport("websocket")
      setState((previous) => ({
        ...previous,
        status: reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting",
      }))

      socket = new WebSocket(target)
      socket.onopen = () => {
        reconnectAttemptRef.current = 0
        setState((previous) => ({
          ...previous,
          connected: true,
          status: "connected",
          reconnectAttempt: 0,
          lastError: null,
        }))
      }
      socket.onmessage = (event) => handleIncomingEvent(String(event.data))
      socket.onerror = () => {
        if (mode === "auto") {
          connectViaSse()
          return
        }

        scheduleReconnect("websocket", "WebSocket transport failed")
      }
      socket.onclose = () => scheduleReconnect("websocket", "WebSocket closed")
    }

    const connect = () => {
      if (unmounted) return
      if (mode === "sse") {
        connectViaSse()
        return
      }
      if (mode === "websocket") {
        connectViaWebSocket()
        return
      }
      connectViaWebSocket()
    }

    connect()

    staleTimerRef.current = setInterval(() => {
      const lastEventAt = lastEventAtRef.current
      if (!lastEventAt || hasDispatchedStaleRef.current) return

      if (Date.now() - lastEventAt <= staleAfterMs) return

      hasDispatchedStaleRef.current = true
      setState((previous) => ({
        ...previous,
        status: "stale",
      }))

      void onStaleRef.current?.({
        requestId: requestIdRef.current,
        attempt: reconnectAttemptRef.current,
        transport: transportRef.current,
      })
    }, Math.max(1000, Math.round(staleAfterMs / 3)))

    return () => {
      unmounted = true
      clearReconnect()
      if (staleTimerRef.current) {
        clearInterval(staleTimerRef.current)
        staleTimerRef.current = null
      }
      disconnect()
      setState((previous) => ({
        ...previous,
        connected: false,
        status: "closed",
      }))
    }
  }, [channels, channelsKey, endpoint, handleIncomingEvent, markTransport, maxBackoffMs, mode, staleAfterMs])

  return state
}
