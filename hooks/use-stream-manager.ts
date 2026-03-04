"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type StreamChannel = {
  id: string
  name: string
  platform: "YouTube" | "Twitch" | "TikTok" | "Custom"
  status: "idle" | "streaming" | "paused"
  viewers: number
  duration: number
  bitrate: number
  fps: number
}

type StreamStats = {
  totalViewers: number
  avgBitrate: number
  droppedFrames: number
}

type StreamsEnvelope = {
  data?: {
    streams?: Array<{
      id: string
      title: string
      platform?: string
      status: "scheduled" | "live" | "ended" | "paused"
      viewer_count?: number
      started_at?: string | null
    }>
  }
  streams?: Array<{
    id: string
    title: string
    platform?: string
    status: "scheduled" | "live" | "ended" | "paused"
    viewer_count?: number
    started_at?: string | null
  }>
  error?: { message?: string }
}

type StreamMetricsResponse = {
  metrics?: {
    viewerCount?: number
    bitrate?: number
    fps?: number
    droppedFrames?: number
  }
}

type StreamMetricsSsePayload = {
  entries?: Array<{
    streamId: string
    viewerCount: number
    bitrate: number
    fps: number
    droppedFrames: number
  }>
}

function toUiStatus(status: string): StreamChannel["status"] {
  if (status === "live") return "streaming"
  if (status === "paused") return "paused"
  return "idle"
}

function toApiStatus(status: "start" | "stop" | "pause"): "live" | "ended" | "paused" {
  if (status === "start") return "live"
  if (status === "pause") return "paused"
  return "ended"
}

function toPlatform(platform?: string): StreamChannel["platform"] {
  if (platform === "YouTube" || platform === "Twitch" || platform === "TikTok") return platform
  return "Custom"
}

function computeDurationSeconds(startedAt?: string | null) {
  if (!startedAt) return 0
  const parsed = new Date(startedAt).getTime()
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor((Date.now() - parsed) / 1000))
}

export function useStreamManager(pollIntervalMs = 7000) {
  const [streams, setStreams] = useState<StreamChannel[]>([])
  const [selectedStream, setSelectedStream] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchStreams = useCallback(async () => {
    const response = await fetch("/api/streams", { cache: "no-store" })
    const payload = (await response.json()) as StreamsEnvelope

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Failed to load streams")
    }

    const source = payload.data?.streams ?? payload.streams ?? []
    const mapped: StreamChannel[] = source.map((stream) => ({
      id: String(stream.id),
      name: stream.title,
      platform: toPlatform(stream.platform),
      status: toUiStatus(stream.status),
      viewers: Number(stream.viewer_count ?? 0),
      duration: computeDurationSeconds(stream.started_at),
      bitrate: 0,
      fps: 0,
    }))

    setStreams(mapped)
    setSelectedStream((current) => {
      if (current && mapped.some((stream) => stream.id === current)) {
        return current
      }
      return mapped[0]?.id ?? ""
    })
  }, [])

  const fetchMetrics = useCallback(async () => {
    const liveStreams = streams.filter((stream) => stream.status === "streaming")
    if (liveStreams.length === 0) {
      reconnectAttempts.current = 0
      return
    }

    setIsPolling(true)
    try {
      const metricEntries = await Promise.all(
        liveStreams.map(async (stream) => {
          const response = await fetch(`/api/streams/metrics?streamId=${encodeURIComponent(stream.id)}`, {
            cache: "no-store",
          })
          if (!response.ok) throw new Error("metrics_fetch_failed")

          const payload = (await response.json()) as StreamMetricsResponse
          return {
            id: stream.id,
            viewers: Number(payload.metrics?.viewerCount ?? stream.viewers),
            bitrate: Number(payload.metrics?.bitrate ?? stream.bitrate),
            fps: Number(payload.metrics?.fps ?? stream.fps),
            droppedFrames: Number(payload.metrics?.droppedFrames ?? 0),
          }
        }),
      )

      reconnectAttempts.current = 0
      setStreams((current) =>
        current.map((stream) => {
          const metrics = metricEntries.find((entry) => entry.id === stream.id)
          if (!metrics) return stream

          return {
            ...stream,
            viewers: metrics.viewers,
            bitrate: metrics.bitrate,
            fps: metrics.fps,
          }
        }),
      )
    } finally {
      setIsPolling(false)
    }
  }, [liveStreamIdsKey])

  const refresh = useCallback(async () => {
    try {
      setError(null)
      await fetchStreams()
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Unable to load streams")
    } finally {
      setIsLoading(false)
    }
  }, [fetchStreams])

  const mutateStream = useCallback(
    async (url: string, options: RequestInit & { correlationId: string }, action: string) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": options.correlationId,
          ...(options.headers ?? {}),
        },
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: { message: `${action} failed` } }))) as {
          error?: { message?: string }
        }
        throw new Error(payload.error?.message ?? `${action} failed`)
      }

      await refresh()
    },
    [refresh],
  )

  const startStream = useCallback(
    async (streamId: string) => {
      await mutateStream(
        "/api/streams",
        {
          method: "PATCH",
          body: JSON.stringify({ id: streamId, status: toApiStatus("start") }),
          correlationId: crypto.randomUUID(),
        },
        "stream.start",
      )
    },
    [mutateStream],
  )

  const stopStream = useCallback(
    async (streamId: string) => {
      await mutateStream(
        "/api/streams",
        {
          method: "PATCH",
          body: JSON.stringify({ id: streamId, status: toApiStatus("stop") }),
          correlationId: crypto.randomUUID(),
        },
        "stream.stop",
      )
    },
    [mutateStream],
  )

  const pauseStream = useCallback(
    async (streamId: string) => {
      await mutateStream(
        "/api/streams",
        {
          method: "PATCH",
          body: JSON.stringify({ id: streamId, status: toApiStatus("pause") }),
          correlationId: crypto.randomUUID(),
        },
        "stream.pause",
      )
    },
    [mutateStream],
  )

  const removeStream = useCallback(
    async (streamId: string) => {
      await mutateStream(
        `/api/streams/${streamId}`,
        {
          method: "DELETE",
          correlationId: crypto.randomUUID(),
        },
        "stream.remove",
      )
    },
    [mutateStream],
  )

  const addStream = useCallback(
    async (payload?: { name?: string; platform?: StreamChannel["platform"] }) => {
      await mutateStream(
        "/api/streams",
        {
          method: "POST",
          body: JSON.stringify({
            title: payload?.name?.trim() || `Stream ${new Date().toLocaleTimeString()}`,
            platform: payload?.platform ?? "Custom",
            description: "",
          }),
          correlationId: crypto.randomUUID(),
        },
        "stream.add",
      )
    },
    [mutateStream],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])


  const liveStreamIdsKey = useMemo(
    () =>
      streams
        .filter((stream) => stream.status === "streaming")
        .map((stream) => stream.id)
        .sort()
        .join(","),
    [streams],
  )

  useEffect(() => {
    if (!liveStreamIdsKey) {
      setIsRealtimeConnected(false)
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      return
    }

    const streamIds = encodeURIComponent(liveStreamIdsKey)
    const eventSource = new EventSource(`/api/streams/metrics/stream?streamIds=${streamIds}`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener("ready", () => {
      reconnectAttempts.current = 0
      setIsRealtimeConnected(true)
      setError(null)
    })

    eventSource.addEventListener("metrics", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as StreamMetricsSsePayload
      const entries = payload.entries ?? []
      if (entries.length === 0) return

      setStreams((current) =>
        current.map((stream) => {
          const metrics = entries.find((entry) => entry.streamId === stream.id)
          if (!metrics) return stream

          return {
            ...stream,
            viewers: metrics.viewerCount,
            bitrate: metrics.bitrate,
            fps: metrics.fps,
          }
        }),
      )
    })

    eventSource.addEventListener("error", () => {
      setIsRealtimeConnected(false)
      reconnectAttempts.current += 1
    })

    return () => {
      eventSource.close()
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null
      }
    }
  }, [liveStreamIdsKey])

  useEffect(() => {
    if (isLoading || isRealtimeConnected) return

    const interval = setInterval(() => {
      void fetchMetrics().catch(async () => {
        reconnectAttempts.current += 1
        const waitMs = Math.min(30000, reconnectAttempts.current * 2000)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      })
    }, pollIntervalMs)

    return () => clearInterval(interval)
  }, [fetchMetrics, isLoading, isRealtimeConnected, pollIntervalMs])

  const stats = useMemo<StreamStats>(() => {
    const activeStreams = streams.filter((stream) => stream.status === "streaming")
    const totalViewers = activeStreams.reduce((sum, stream) => sum + stream.viewers, 0)
    const avgBitrate = Math.round(
      activeStreams.reduce((sum, stream) => sum + stream.bitrate, 0) / Math.max(activeStreams.length, 1),
    )

    return {
      totalViewers,
      avgBitrate,
      droppedFrames: 0,
    }
  }, [liveStreamIdsKey])

  return {
    streams,
    selectedStream,
    setSelectedStream,
    stats,
    isLoading,
    isPolling,
    isRealtimeConnected,
    error,
    refresh,
    actions: {
      startStream,
      stopStream,
      pauseStream,
      removeStream,
      addStream,
    },
  }
}
