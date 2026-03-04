"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Users, AlertTriangle, Shield } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useModeration } from "@/components/moderation-provider"
import { useAuth } from "@/hooks/use-auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LiveChatProps {
  streamId: string
}

interface ChatMessage {
  id: string
  user: {
    name: string
    avatar?: string
    initials: string
    isHost?: boolean
    isModerator?: boolean
  }
  message: string
  timestamp: Date
  isModerated?: boolean
  moderationScore?: number
}

export default function LiveChat({ streamId }: LiveChatProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: {
        name: "TechConnect",
        initials: "TC",
        isHost: true,
      },
      message: "Welcome everyone to our Tech Showcase 2025! We're excited to show you the future of AI today.",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
    {
      id: "2",
      user: {
        name: "Sarah Johnson",
        initials: "SJ",
      },
      message: "Can't wait to see the new smart home devices!",
      timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
    },
    {
      id: "3",
      user: {
        name: "Mike Chen",
        initials: "MC",
      },
      message: "Will there be any discounts for early buyers?",
      timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    },
    {
      id: "4",
      user: {
        name: "ModeratorAlex",
        initials: "MA",
        isModerator: true,
      },
      message: "Please keep the chat focused on the products being showcased. Thanks!",
      timestamp: new Date(Date.now() - 1000 * 60 * 1), // 1 minute ago
    },
    {
      id: "5",
      user: {
        name: "TechConnect",
        initials: "TC",
        isHost: true,
      },
      message: "Yes, we'll be offering special discounts for viewers who purchase during the stream!",
      timestamp: new Date(Date.now() - 1000 * 30), // 30 seconds ago
    },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { moderateMessage, settings } = useModeration()
  const { user } = useAuth()
  const [isModerating, setIsModerating] = useState(false)

  const handleSendMessage = async () => {
    if (message.trim() === "") return

    // Create a temporary message object
    const newMessageId = Date.now().toString()
    const newMessage: ChatMessage = {
      id: newMessageId,
      user: {
        name: user?.name || "You",
        initials: user?.name ? user.name.substring(0, 2).toUpperCase() : "YO",
      },
      message: message.trim(),
      timestamp: new Date(),
    }

    // Add message to chat immediately for better UX
    setMessages([...messages, newMessage])
    setMessage("")

    // If moderation is enabled, check the message
    if (settings.enabled) {
      setIsModerating(true)
      try {
        const result = await moderateMessage(newMessage.message, user?.id || "anonymous", user?.name || "Anonymous")

        // Update the message with moderation results
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageId
              ? {
                  ...msg,
                  isModerated: result.action !== "allow",
                  moderationScore: result.score,
                  // If auto-delete is enabled and message is blocked, replace content
                  message:
                    settings.autoDeleteEnabled && result.action === "block"
                      ? "<Message removed by AI moderation>"
                      : msg.message,
                }
              : msg,
          ),
        )
      } catch (error) {
        console.error("Error moderating message:", error)
      } finally {
        setIsModerating(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl border bg-card shadow-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-medium">Live Chat</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" /> 1.2K
        </Badge>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={msg.user.avatar || "/placeholder.svg?height=32&width=32"} />
                <AvatarFallback
                  className={`text-xs ${
                    msg.user.isHost
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : msg.user.isModerator
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {msg.user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{msg.user.name}</span>
                  {msg.user.isHost && (
                    <Badge className="bg-orange-500 text-[10px]" variant="secondary">
                      HOST
                    </Badge>
                  )}
                  {msg.user.isModerator && (
                    <Badge className="bg-blue-500 text-[10px]" variant="secondary">
                      MOD
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>

                  {/* Moderation indicator */}
                  {msg.isModerated && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This message was flagged by AI moderation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className={`text-sm ${msg.isModerated ? "italic text-muted-foreground" : ""}`}>{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={isModerating}
          />
          <Button
            onClick={handleSendMessage}
            disabled={message.trim() === "" || isModerating}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {settings.enabled && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>AI moderation is active</span>
          </div>
        )}
      </div>
    </div>
  )
}
