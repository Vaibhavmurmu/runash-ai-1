"use client"

import { useCallback, useEffect, useState } from "react"
import type { BackgroundImage } from "@/types/virtual-backgrounds"

type State = {
  data: BackgroundImage[]
  loading: boolean
  error: string | null
}

const DEFAULT_STREAM_ID = "studio-default"

export function useStreamBackgrounds(streamId = DEFAULT_STREAM_ID) {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`/api/streams/${streamId}/backgrounds`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load backgrounds")
      }
      setState({ data: payload.data?.backgrounds ?? payload.backgrounds ?? [], loading: false, error: null })
    } catch (error) {
      setState({ data: [], loading: false, error: error instanceof Error ? error.message : "Failed to load backgrounds" })
    }
  }, [streamId])

  useEffect(() => {
    void load()
  }, [load])

  const upload = useCallback(
    async (background: Omit<BackgroundImage, "createdAt" | "downloadCount"> & Partial<Pick<BackgroundImage, "createdAt" | "downloadCount">>) => {
      const response = await fetch(`/api/streams/${streamId}/backgrounds`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(background),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to upload background")
      }
      await load()
      return payload.data?.background ?? payload.background
    },
    [load, streamId],
  )

  const save = useCallback(
    async (backgroundId: string, patch: Partial<BackgroundImage>) => {
      const response = await fetch(`/api/streams/${streamId}/backgrounds/${backgroundId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to update background")
      }
      await load()
    },
    [load, streamId],
  )

  const remove = useCallback(
    async (backgroundId: string) => {
      const response = await fetch(`/api/streams/${streamId}/backgrounds/${backgroundId}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to delete background")
      }
      await load()
    },
    [load, streamId],
  )

  return { ...state, refresh: load, upload, save, remove }
}
