"use client"

import { useEffect, useRef } from "react"
import { Copy, ThumbsUp as Thumbs } from "lucide-react"

interface Message {
  id: number
  text: string
  role: "user" | "assistant"
}

interface ChatPanelProps {
  messages: Message[]
  isLoading: boolean
}

export default function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
            <p className="text-muted-foreground">Ask me anything about video creation, editing, or streaming</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                <p className="text-sm">{message.text}</p>
                {message.role === "assistant" && (
                  <div className="flex gap-2 mt-2">
                    <button className="inline-flex items-center gap-1 text-xs hover:opacity-70 transition-opacity">
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs hover:opacity-70 transition-opacity">
                      <Thumbs className="h-3 w-3" />
                      Like
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 border border-border">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
}
