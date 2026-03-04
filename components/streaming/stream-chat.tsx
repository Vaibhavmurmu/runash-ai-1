"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Bot } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ChatMessage {
  id: string
  user: { name: string; isHost: boolean; isBot: boolean }
  message: string
  timestamp: Date
}

interface StreamChatProps {
  isStreaming: boolean
  streamId?: string | null
}

export default function StreamChat({ isStreaming, streamId }: StreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [aiModeration, setAiModeration] = useState(true)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)

  useEffect(() => {
    if (!isStreaming || !streamId) {
      setMessages([
        {
          id: "0",
          user: { name: "System", isHost: false, isBot: true },
          message: "Chat will be available when you start streaming.",
          timestamp: new Date(),
        },
      ])
      return
    }

    const eventSource = new EventSource(`/api/streams/${streamId}/chat/sse`)
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; data?: any[] }
        if (payload.type !== "messages") return
        setMessages((prev) => {
          const incoming = (payload.data ?? []).map((msg) => ({
            id: String(msg.id),
            user: { name: msg.username ?? "Viewer", isHost: false, isBot: false },
            message: msg.text ?? msg.message,
            timestamp: new Date(msg.createdAt ?? Date.now()),
          }))
          return [...prev, ...incoming].slice(-100)
        })
      } catch {
        // ignore malformed message
      }
    }

    return () => eventSource.close()
  }, [isStreaming, streamId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !isStreaming || !streamId) return

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      user: { name: "You", isHost: true, isBot: false },
      message: newMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, optimistic])

    const text = newMessage
    setNewMessage("")

    const response = await fetch(`/api/streams/${streamId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, platform: "custom", metadata: { source: "studio-host" } }),
    })

    if (!response.ok) {
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id))
    }
  }

  const applyControlAction = async (action: Record<string, unknown>) => {
    if (!streamId) return
    await fetch(`/api/dashboard/streams/live-control/${streamId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-orange-100 dark:border-orange-900/20 flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-4 w-4 text-orange-500 mr-2" />
          <span className="text-sm font-medium">AI Chat Assistant</span>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="ai-moderation" checked={aiModeration} onCheckedChange={setAiModeration} />
          <Label htmlFor="ai-moderation" className="text-xs">Moderation</Label>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex flex-wrap gap-1 pb-2 border-b">
          <Button size="sm" variant="outline" onClick={() => void applyControlAction({ type: "qna_start" })}>Start Q&A</Button>
          <Button size="sm" variant="outline" onClick={() => selectedMessageId && void applyControlAction({ type: "qna_select", questionId: selectedMessageId })}>Select Q</Button>
          <Button size="sm" variant="outline" onClick={() => void applyControlAction({ type: "qna_end" })}>End Q&A</Button>
          <Button size="sm" variant="outline" onClick={() => void applyControlAction({ type: "poll_create", question: "How are we doing?", options: ["Great", "Okay", "Needs work"] })}>Create Poll</Button>
        </div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.user.isHost ? "justify-end" : "justify-start"}`}
            onClick={() => setSelectedMessageId(msg.id)}
          >
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-medium text-xs">{msg.user.name}</span>
                {msg.user.isHost && <Badge variant="outline" className="text-[10px] py-0 h-4">Host</Badge>}
                {msg.user.isBot && <Badge variant="outline" className="text-[10px] py-0 h-4"><Sparkles className="h-2 w-2 mr-1" />AI</Badge>}
              </div>
              <p>{msg.message}</p>
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => void applyControlAction({ type: "pin_message", messageId: msg.id })}>Pin</Button>
                <Button size="sm" variant="ghost" onClick={() => void applyControlAction({ type: "unpin_message" })}>Unpin</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-orange-100 dark:border-orange-900/20">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input placeholder={isStreaming ? "Type a message..." : "Start streaming to chat"} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!isStreaming} className="flex-1" />
          <Button type="submit" size="icon" disabled={!isStreaming || !newMessage.trim()} className="bg-orange-500 hover:bg-orange-600 text-white"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}
