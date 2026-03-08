"use client"

import { useCallback, useEffect, useState } from "react"

type State<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

const DEFAULT_STREAM_ID = "studio-default"

export function useStreamMetadata<T extends Record<string, unknown>>(streamId = DEFAULT_STREAM_ID) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`/api/streams/${streamId}/metadata`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to load metadata")
      setState({ data: (payload.data?.metadata ?? payload.metadata ?? null) as T | null, loading: false, error: null })
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : "Failed to load metadata" })
    }
  }, [streamId])

  useEffect(() => {
    void load()
  }, [load])

  const update = useCallback(
    async (patch: Partial<T>) => {
      const response = await fetch(`/api/streams/${streamId}/metadata`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to save metadata")
      setState({ data: (payload.data?.metadata ?? payload.metadata ?? null) as T | null, loading: false, error: null })
    },
    [streamId],
  )

  return { ...state, refresh: load, update }
}
