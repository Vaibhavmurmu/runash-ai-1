"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, MessageCircle, ShoppingCart, Heart, Gift, Crown, Settings } from "lucide-react"

type ChatMessage = {
  id: string
  streamId: string
  userId: string
  username: string
  userAvatar?: string
  message: string
  timestamp: Date
  type: "message" | "purchase" | "product_highlight" | "system"
  metadata?: {
    productId?: string
    productName?: string
    price?: number
  }
}

interface LiveStreamChatProps {
  streamId: string
}

export default function LiveStreamChat({ streamId }: LiveStreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "offline">("connecting")
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const parseMessage = (raw: Record<string, unknown>): ChatMessage | null => {
    const id = String(raw.id ?? "")
    const text = typeof raw.text === "string" ? raw.text : typeof raw.message === "string" ? raw.message : ""

    if (!id || !text) {
      return null
    }

    return {
      id,
      streamId,
      userId: String(raw.userId ?? raw.user_id ?? "viewer"),
      username: String(raw.username ?? "Viewer"),
      message: text,
      timestamp: new Date(Number(raw.createdAt) || Date.parse(String(raw.created_at ?? "")) || Date.now()),
      type: (raw.type as ChatMessage["type"]) ?? "message",
    }
  }

  useEffect(() => {
    let retryAttempt = 0

    const connect = async () => {
      setConnectionStatus("connecting")

      try {
        const response = await fetch(`/api/streams/${streamId}/chat?limit=100`, { cache: "no-store" })
        if (response.ok) {
          const payload = await response.json()
          const nextMessages = (payload.messages ?? [])
            .map((message: Record<string, unknown>) => parseMessage(message))
            .filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))
          setMessages(nextMessages)
        }
      } catch {
        setConnectionError("Unable to load chat history")
      }

      const eventSource = new EventSource(`/api/streams/${streamId}/chat/sse`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        retryAttempt = 0
        setConnectionStatus("connected")
        setConnectionError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload?.type === "messages" && Array.isArray(payload.data)) {
            const incoming = payload.data
              .map((message: Record<string, unknown>) => parseMessage(message))
              .filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))

            setMessages((previous) => {
              const seen = new Set(previous.map((message) => message.id))
              const deduped = incoming.filter((message) => !seen.has(message.id))
              return [...previous, ...deduped]
            })
          }
        } catch {
          setConnectionError("Received malformed chat update")
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setConnectionStatus("offline")
        setConnectionError("Chat connection lost. Reconnecting…")

        const backoff = Math.min(1000 * 2 ** retryAttempt, 30000)
        retryAttempt += 1
        reconnectTimeoutRef.current = setTimeout(connect, backoff)
      }
    }

    void connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      eventSourceRef.current?.close()
    }
  }, [streamId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const pendingMessage = newMessage
    setNewMessage("")

    void fetch(`/api/streams/${streamId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pendingMessage, username: "You" }),
    }).catch(() => {
      setConnectionError("Could not send message. Please retry.")
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getMessageIcon = (type: ChatMessage["type"]) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="h-3 w-3 text-green-500" />
      case "product_highlight":
        return <Gift className="h-3 w-3 text-purple-500" />
      case "system":
        return <Crown className="h-3 w-3 text-yellow-500" />
      default:
        return <MessageCircle className="h-3 w-3 text-blue-500" />
    }
  }

  const formatMessage = (message: ChatMessage) => {
    if (message.type === "purchase" && message.metadata) {
      return (
        <div className="space-y-1">
          <div>{message.message}</div>
          <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
            Purchased: {message.metadata.productName} - ${message.metadata.price}
          </div>
        </div>
      )
    }
    return message.message
  }

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <MessageCircle className="h-4 w-4" />
            <span>Live Chat</span>
            <Badge variant="secondary" className="text-xs">
              {messages.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            ></div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-3 pb-4">
            {connectionError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                {connectionError}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-2 text-sm">
                <div className="flex-shrink-0 mt-1">{getMessageIcon(message.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {message.userAvatar && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={message.userAvatar || "/placeholder.svg"} />
                        <AvatarFallback>{message.username[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <span
                      className={`font-medium text-xs ${
                        message.userId === "host"
                          ? "text-purple-600"
                          : message.userId === "system"
                            ? "text-yellow-600"
                            : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {message.username}
                      {message.userId === "host" && <Crown className="inline h-3 w-3 ml-1 text-purple-500" />}
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`text-xs ${
                      message.type === "system"
                        ? "text-yellow-700 dark:text-yellow-300 font-medium"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {formatMessage(message)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 text-sm"
              maxLength={200}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{newMessage.length}/200</span>
            <div className="flex items-center space-x-2">
              <Heart className="h-3 w-3" />
              <span>Be kind and respectful</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
