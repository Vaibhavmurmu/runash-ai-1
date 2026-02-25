"use client"

import { useCallback, useMemo, useReducer } from "react"
import {
  initialAlertsRealtimeState,
  initialAutomationRealtimeState,
  initialChatRealtimeState,
  initialEditorJobsRealtimeState,
  initialStreamsRealtimeState,
  reduceAlertsRealtime,
  reduceAutomationRealtime,
  reduceChatRealtime,
  reduceEditorJobsRealtime,
  reduceStreamsRealtime,
  type AlertsRealtimeState,
  type AutomationRealtimeState,
  type ChatRealtimeState,
  type EditorJobsRealtimeState,
  type StreamsRealtimeState,
} from "@/lib/hooks/realtime-reducers"
import { useRealtimeClient, type RealtimeEventEnvelope } from "@/lib/hooks/use-realtime-client"

type UseModuleRealtimeOptions = {
  endpoint?: string
  mode?: "sse" | "websocket" | "auto"
  staleAfterMs?: number
  refreshOnStale?: () => Promise<void> | void
}

export function useStreamsRealtime(options: UseModuleRealtimeOptions = {}) {
  const [state, dispatch] = useReducer(reduceStreamsRealtime, initialStreamsRealtimeState)

  const onEvent = useCallback((event: RealtimeEventEnvelope) => {
    dispatch(event)
  }, [])

  const connection = useRealtimeClient({
    endpoint: options.endpoint ?? "/api/realtime",
    channels: ["streams"],
    mode: options.mode,
    staleAfterMs: options.staleAfterMs,
    onEvent,
    onStale: options.refreshOnStale,
  })

  return useMemo(() => ({ ...connection, state }), [connection, state])
}

export function useAlertsRealtime(options: UseModuleRealtimeOptions = {}) {
  const [state, dispatch] = useReducer(reduceAlertsRealtime, initialAlertsRealtimeState)

  const onEvent = useCallback((event: RealtimeEventEnvelope) => {
    dispatch(event)
  }, [])

  const connection = useRealtimeClient({
    endpoint: options.endpoint ?? "/api/realtime",
    channels: ["alerts"],
    mode: options.mode,
    staleAfterMs: options.staleAfterMs,
    onEvent,
    onStale: options.refreshOnStale,
  })

  return useMemo(() => ({ ...connection, state }), [connection, state])
}

export function useChatRealtime(options: UseModuleRealtimeOptions = {}) {
  const [state, dispatch] = useReducer(reduceChatRealtime, initialChatRealtimeState)

  const onEvent = useCallback((event: RealtimeEventEnvelope) => {
    dispatch(event)
  }, [])

  const connection = useRealtimeClient({
    endpoint: options.endpoint ?? "/api/realtime",
    channels: ["chat"],
    mode: options.mode,
    staleAfterMs: options.staleAfterMs,
    onEvent,
    onStale: options.refreshOnStale,
  })

  return useMemo(() => ({ ...connection, state }), [connection, state])
}

export function useAutomationRealtime(options: UseModuleRealtimeOptions = {}) {
  const [state, dispatch] = useReducer(reduceAutomationRealtime, initialAutomationRealtimeState)

  const onEvent = useCallback((event: RealtimeEventEnvelope) => {
    dispatch(event)
  }, [])

  const connection = useRealtimeClient({
    endpoint: options.endpoint ?? "/api/realtime",
    channels: ["automation"],
    mode: options.mode,
    staleAfterMs: options.staleAfterMs,
    onEvent,
    onStale: options.refreshOnStale,
  })

  return useMemo(() => ({ ...connection, state }), [connection, state])
}

export function useEditorJobsRealtime(options: UseModuleRealtimeOptions = {}) {
  const [state, dispatch] = useReducer(reduceEditorJobsRealtime, initialEditorJobsRealtimeState)

  const onEvent = useCallback((event: RealtimeEventEnvelope) => {
    dispatch(event)
  }, [])

  const connection = useRealtimeClient({
    endpoint: options.endpoint ?? "/api/realtime",
    channels: ["editor-jobs"],
    mode: options.mode,
    staleAfterMs: options.staleAfterMs,
    onEvent,
    onStale: options.refreshOnStale,
  })

  return useMemo(() => ({ ...connection, state }), [connection, state])
}

export type {
  AlertsRealtimeState,
  AutomationRealtimeState,
  ChatRealtimeState,
  EditorJobsRealtimeState,
  StreamsRealtimeState,
}
