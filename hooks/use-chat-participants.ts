"use client"

import { useCallback, useEffect, useState } from "react"
import type { StreamingPlatform } from "@/types/platform-chat"

export type ChatParticipant = {
  id: string
  username: string
  platform: StreamingPlatform
  isModerator: boolean
  isSubscriber: boolean
  isVIP: boolean
  timedOutUntil?: string | null
}

type State = {
  data: ChatParticipant[]
  loading: boolean
  error: string | null
}

const DEFAULT_STREAM_ID = "studio-default"

export function useChatParticipants(streamId = DEFAULT_STREAM_ID, platform?: StreamingPlatform) {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const query = platform ? `?platform=${platform}` : ""
      const response = await fetch(`/api/streams/${streamId}/participants${query}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to load participants")
      setState({ data: payload.data?.participants ?? payload.participants ?? [], loading: false, error: null })
    } catch (error) {
      setState({ data: [], loading: false, error: error instanceof Error ? error.message : "Failed to load participants" })
    }
  }, [platform, streamId])

  useEffect(() => {
    void load()
  }, [load])

  const moderate = useCallback(
    async (participantId: string, action: "make_moderator" | "make_vip" | "timeout" | "clear_timeout") => {
      const response = await fetch(`/api/streams/${streamId}/participants/${participantId}/moderation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Moderation action failed")
      await load()
    },
    [load, streamId],
  )

  return { ...state, refresh: load, moderate }
}
