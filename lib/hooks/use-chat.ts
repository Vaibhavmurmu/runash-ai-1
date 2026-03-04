"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useChatRealtime } from "@/lib/hooks/use-module-realtime"

export type ChatMessage = {
  id: string
  stream_id: string
  user_id?: string | null
  username: string
  message: string
  message_type: "message" | "follow" | "purchase" | "tip"
  amount?: number | null
  created_at: string
}

export function useChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      // TODO: Implement /api/streams/[id]/messages endpoint for Neon
      setMessages([])
    } catch (err) {
      console.error("Error fetching messages:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const realtime = useChatRealtime({
    refreshOnStale: fetchMessages,
  })

  const streamMessages = useMemo(() => {
    if (!streamId) return []

    const list = realtime.state.byStreamId[streamId] ?? []
    return list.map((message) => ({
      id: message.id,
      stream_id: message.streamId,
      user_id: message.userId,
      username: message.username ?? "anonymous",
      message: message.message,
      message_type: "message" as const,
      created_at: message.createdAt,
    }))
  }, [realtime.state.byStreamId, streamId])

  useEffect(() => {
    if (streamId) {
      void fetchMessages()
    }
  }, [fetchMessages, streamId])

  useEffect(() => {
    if (!streamMessages.length) return

    setMessages((previous) => {
      const merged = new Map<string, ChatMessage>()
      streamMessages.forEach((message) => {
        merged.set(message.id, message)
      })
      previous.forEach((message) => {
        if (!merged.has(message.id)) {
          merged.set(message.id, message)
        }
      })

      return Array.from(merged.values())
    })
  }, [streamMessages])

  const sendMessage = async (messageData: Partial<ChatMessage>) => {
    try {
      // TODO: Implement /api/streams/[id]/messages POST endpoint for Neon
      return { data: null, error: "Chat messages API not yet implemented" }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  return {
    messages,
    loading,
    sendMessage,
    realtime,
  }
}
