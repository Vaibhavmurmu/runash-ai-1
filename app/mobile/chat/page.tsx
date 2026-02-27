"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Filter, MoreVertical, ThumbsUp, Ban, Flag } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import MobileLayout from "@/components/mobile/layout"
import type { ChatMessage, MobileChatListResponse, MobileSendChatMessageResponse } from "@/types/mobile-app"

export default function MobileChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [cursor, setCursor] = useState<string>(new Date(0).toISOString())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/mobile/chat")
        const body = (await response.json()) as { data?: MobileChatListResponse }
        if (!response.ok || !body.data) return

        setMessages(body.data.messages)
        setCursor(body.data.cursor)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const source = new EventSource(`/api/mobile/chat/stream?cursor=${encodeURIComponent(cursor)}`)
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as MobileChatListResponse
      if (!payload.messages?.length) return

      setMessages((previous) => {
        const known = new Set(previous.map((item) => item.id))
        const incoming = payload.messages.filter((item) => !known.has(item.id))
        return incoming.length > 0 ? [...previous, ...incoming] : previous
      })
      setCursor(payload.cursor)
    }

    return () => source.close()
  }, [cursor, isLoading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return

    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      platform: "twitch",
      username: "You (Streamer)",
      message: messageInput,
      timestamp: new Date().toISOString(),
      isModerator: true,
    }

    setMessages((previous) => [...previous, optimisticMessage])
    setMessageInput("")

    try {
      const response = await fetch("/api/mobile/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: optimisticMessage.platform,
          username: optimisticMessage.username,
          message: optimisticMessage.message,
          isModerator: true,
        }),
      })

      const body = (await response.json()) as { data?: MobileSendChatMessageResponse }
      if (!response.ok || !body.data?.message) {
        throw new Error("send_failed")
      }

      setMessages((previous) => previous.map((item) => (item.id === optimisticMessage.id ? body.data!.message : item)))
      setCursor(body.data.message.timestamp)
    } catch {
      setMessages((previous) => previous.filter((item) => item.id !== optimisticMessage.id))
      setMessageInput(optimisticMessage.message)
    }
  }

  const handleHighlightMessage = (id: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, isHighlighted: !msg.isHighlighted } : msg)))
  }

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  const filteredMessages = useMemo(
    () => (activeTab === "all" ? messages : messages.filter((msg) => msg.platform === activeTab)),
    [activeTab, messages],
  )

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading chat...</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Live Chat</h2>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="twitch">Twitch</TabsTrigger>
              <TabsTrigger value="youtube">YouTube</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.map((message) => (
            <Card
              key={message.id}
              className={`${
                message.isHighlighted
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{message.username}</span>
                    <Badge variant="outline" className="text-xs">{message.platform}</Badge>
                    {message.isModerator && <Badge className="text-xs bg-blue-500">Mod</Badge>}
                    {message.isSubscriber && <Badge className="text-xs bg-purple-500">Sub</Badge>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleHighlightMessage(message.id)}>
                        <ThumbsUp className="h-4 w-4 mr-2" /> Highlight
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Ban className="h-4 w-4 mr-2" /> Timeout User
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="h-4 w-4 mr-2" /> Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-red-500">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm">{message.message}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
              </CardContent>
            </Card>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder="Send a message..." />
          <Button type="submit" className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </MobileLayout>
  )
}
