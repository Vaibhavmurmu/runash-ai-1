"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Stream, UUID } from "@/lib/types"
import { useStreamsRealtime } from "@/lib/hooks/use-module-realtime"

export function useStreams(userId?: UUID) {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStreams = useCallback(async () => {
    setLoading(true)

    try {
      setError(null)
      const url = userId ? `/api/streams?userId=${userId}` : "/api/streams"
      const response = await fetch(url)
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Failed to fetch streams")
      setStreams(json.data ?? [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setLoading(false)
    }
  }, [userId])

  const realtime = useStreamsRealtime({
    refreshOnStale: fetchStreams,
  })

  const realtimeStreamsById = realtime.state.byId

  const hydratedRealtimeStreams = useMemo(
    () => Object.values(realtimeStreamsById).map((stream) => stream as Stream),
    [realtimeStreamsById],
  )

  useEffect(() => {
    void fetchStreams()
  }, [fetchStreams])

  useEffect(() => {
    if (!hydratedRealtimeStreams.length) return

    setStreams((previous) => {
      const merged = new Map<string, Stream>()

      hydratedRealtimeStreams.forEach((stream) => {
        merged.set(stream.id, stream)
      })

      previous.forEach((stream) => {
        const existing = merged.get(stream.id)
        merged.set(stream.id, existing ? { ...stream, ...existing } : stream)
      })

      return Array.from(merged.values())
    })
  }, [hydratedRealtimeStreams])

  return {
    streams,
    loading,
    error,
    create: async (input: Partial<Stream>) => {
      const r = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, user_id: userId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "create failed")
      setStreams((prev) => [j.data, ...prev])
      return j.data as Stream
    },
    update: async (id: string, input: Partial<Stream>) => {
      const r = await fetch(`/api/streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "update failed")
      setStreams((prev) => prev.map((s) => (s.id === id ? j.data : s)))
      return j.data as Stream
    },
    remove: async (id: string) => {
      const r = await fetch(`/api/streams/${id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("delete failed")
      setStreams((prev) => prev.filter((s) => s.id !== id))
    },
    realtime,
  }
}
