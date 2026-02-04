"use client"

import { useEffect, useState } from "react"

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

  useEffect(() => {
    if (streamId) {
      fetchMessages()
    }
  }, [streamId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      // TODO: Implement /api/streams/[id]/messages endpoint for Neon
      setMessages([])
    } catch (err) {
      console.error("Error fetching messages:", err)
    } finally {
      setLoading(false)
    }
  }

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
  }
}
