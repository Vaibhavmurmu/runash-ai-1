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

export type SendChatError =
  | "CHAT_SEND_BAD_REQUEST"
  | "CHAT_SEND_FAILED"
  | "CHAT_SEND_INVALID_RESPONSE"
  | "CHAT_SEND_NETWORK_ERROR"

type ChatApiMessage = Partial<{
  id: string | number
  stream_id: string | number
  streamId: string | number
  user_id: string | null
  userId: string | null
  username: string
  message: string
  text: string
  message_type: string
  type: string
  amount: number | null
  created_at: string
  createdAt: string
}>

function normalizeMessageType(value?: string): ChatMessage["message_type"] {
  switch (value) {
    case "follow":
    case "purchase":
    case "tip":
    case "message":
      return value
    case "donation":
      return "tip"
    default:
      return "message"
  }
}

export function normalizeChatMessage(input: ChatApiMessage, streamId: string): ChatMessage {
  return {
    id: String(input.id ?? ""),
    stream_id: String(input.stream_id ?? input.streamId ?? streamId),
    user_id: input.user_id ?? input.userId ?? null,
    username: input.username ?? "anonymous",
    message: input.message ?? input.text ?? "",
    message_type: normalizeMessageType(input.message_type ?? input.type),
    amount: typeof input.amount === "number" ? input.amount : null,
    created_at: input.created_at ?? input.createdAt ?? new Date(0).toISOString(),
  }
}

function timestampValue(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mergeChatMessageSources(history: ChatMessage[], realtime: ChatMessage[]): ChatMessage[] {
  const merged = new Map<
    string,
    {
      message: ChatMessage
      timestamp: number
      sourcePriority: number
      seenOrder: number
    }
  >()

  let seenOrder = 0
  const ingest = (list: ChatMessage[], sourcePriority: number) => {
    for (const message of list) {
      const next = {
        message,
        timestamp: timestampValue(message.created_at),
        sourcePriority,
        seenOrder,
      }
      seenOrder += 1

      const current = merged.get(message.id)
      if (!current) {
        merged.set(message.id, next)
        continue
      }

      const replace =
        next.timestamp > current.timestamp ||
        (next.timestamp === current.timestamp && next.sourcePriority > current.sourcePriority) ||
        (next.timestamp === current.timestamp &&
          next.sourcePriority === current.sourcePriority &&
          next.seenOrder > current.seenOrder)

      if (replace) {
        merged.set(message.id, next)
      }
    }
  }

  ingest(history, 1)
  ingest(realtime, 2)

  return Array.from(merged.values())
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return left.timestamp - right.timestamp
      }
      return left.seenOrder - right.seenOrder
    })
    .map((entry) => entry.message)
}

export async function fetchChatHistory(streamId: string, limit = 100): Promise<ChatMessage[]> {
  const searchParams = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(`/api/streams/${streamId}/chat?${searchParams.toString()}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(`CHAT_FETCH_FAILED_${response.status}`)
  }

  const body = (await response.json()) as { messages?: ChatApiMessage[] }
  const messages = Array.isArray(body.messages) ? body.messages : []
  return messages.map((message) => normalizeChatMessage(message, streamId))
}

export async function sendChatMessageRequest(
  streamId: string,
  messageData: Partial<ChatMessage>,
): Promise<{ data: ChatMessage | null; error: SendChatError | null }> {
  const payload = {
    message: messageData.message,
    type: messageData.message_type,
    metadata: {
      amount: messageData.amount,
    },
  }

  try {
    const response = await fetch(`/api/streams/${streamId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (response.status === 400) {
        return { data: null, error: "CHAT_SEND_BAD_REQUEST" }
      }
      return { data: null, error: "CHAT_SEND_FAILED" }
    }

    const result = (await response.json()) as { message?: ChatApiMessage }
    if (!result.message) {
      return { data: null, error: "CHAT_SEND_INVALID_RESPONSE" }
    }

    return { data: normalizeChatMessage(result.message, streamId), error: null }
  } catch {
    return { data: null, error: "CHAT_SEND_NETWORK_ERROR" }
  }
}

export function useChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const historyMessages = await fetchChatHistory(streamId)
      setMessages((previous) => mergeChatMessageSources(historyMessages, previous))
    } catch (err) {
      console.error("Error fetching messages:", err)
    } finally {
      setLoading(false)
    }
  }, [streamId])

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
      amount: null,
      created_at: message.createdAt,
    }))
  }, [realtime.state.byStreamId, streamId])

  useEffect(() => {
    if (streamId) {
      void fetchMessages()
    }
  }, [fetchMessages, streamId])

  useEffect(() => {
    setMessages((previous) => mergeChatMessageSources(previous, streamMessages))
  }, [streamMessages])

  const sendMessage = async (messageData: Partial<ChatMessage>) => {
    return sendChatMessageRequest(streamId, messageData)
  }

  return {
    messages,
    loading,
    sendMessage,
    realtime,
  }
}
