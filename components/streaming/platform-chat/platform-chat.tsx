"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Send, MessageSquare, Users, BarChart, Filter, PanelLeft, PanelRight } from "lucide-react"

import type { ChatMessage, ChatSettings, ChatStatistics, StreamingPlatform } from "@/types/platform-chat"
import { PlatformChatService } from "@/services/platform-chat-service"
import PlatformChatMessage from "./platform-chat-message"
import PlatformChatSettings from "./platform-chat-settings"
import PlatformChatUsers from "./platform-chat-users"
import PlatformChatStats from "./platform-chat-stats"
import PlatformChatFilters from "./platform-chat-filters"
import PlatformSelector from "./platform-selector"

interface PlatformChatProps {
  isStreaming: boolean
  streamId?: string
  initialSettings?: Partial<ChatSettings>
}

export default function PlatformChat({ isStreaming, streamId, initialSettings }: PlatformChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<StreamingPlatform | "all">("all")
  const [activeTab, setActiveTab] = useState("chat")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    showTimestamps: true,
    showBadges: true,
    showAvatars: true,
    fontSize: "medium",
    chatDelay: 0,
    highlightMentions: true,
    showDeletedMessages: false,
    enableChatCommands: true,
    enableEmotes: true,
    enableAutoMod: true,
    platformSettings: {
      twitch: { enabled: true, color: "#9146FF", showPlatformIcon: true },
      youtube: { enabled: true, color: "#FF0000", showPlatformIcon: true },
      facebook: { enabled: true, color: "#1877F2", showPlatformIcon: true },
      tiktok: { enabled: true, color: "#000000", showPlatformIcon: true },
      instagram: { enabled: true, color: "#E1306C", showPlatformIcon: true },
      custom: { enabled: true, color: "#0078D7", showPlatformIcon: true },
    },
  })
  const [chatStats, setChatStats] = useState<ChatStatistics[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatService = PlatformChatService.getInstance()

  // Initialize chat service
  useEffect(() => {
    if (isStreaming && streamId) {
            chatService.configureStream(streamId, "sse")

      // Connect to platforms
      const connectToPlatforms = async () => {
        await chatService.connectToPlatform("twitch", {})
        await chatService.connectToPlatform("youtube", {})
        // Add more platforms as needed
      }

      connectToPlatforms()

      // Subscribe to messages
      const unsubscribeMessage = chatService.onMessage((message) => {
        setMessages((prev) => [...prev, message].slice(-100)) // Keep last 100 messages
      })

      // Subscribe to statistics
      const unsubscribeStats = chatService.onStatisticsUpdate((stats) => {
        setChatStats(stats)
      })

      return () => {
        // Disconnect from platforms
        chatService.getConnectedPlatforms().forEach((platform) => {
          chatService.disconnectFromPlatform(platform)
        })

        // Unsubscribe from events
        unsubscribeMessage()
        unsubscribeStats()
      }
    } else {
      // Clear messages when not streaming
      setMessages([
        {
          id: "system-message",
          user: {
            id: "system",
            username: "System",
            displayName: "System",
            platform: "custom",
            roles: ["broadcaster"],
            badges: [],
          },
          content: "Chat will be available when you start streaming.",
          timestamp: new Date(),
          platform: "custom",
          isDeleted: false,
          isHighlighted: false,
          isPinned: false,
          isAction: false,
          emotes: [],
          mentions: [],
        },
      ])
    }
  }, [chatService, isStreaming, streamId])

  // Apply initial settings
  useEffect(() => {
    if (initialSettings) {
      setChatSettings((prev) => ({
        ...prev,
        ...initialSettings,
      }))
    }
  }, [initialSettings])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageInput.trim() || !isStreaming) return

    const sendToPlatform =
      selectedPlatform === "all"
        ? chatService.sendMessageToAll(messageInput)
        : chatService.sendMessage(messageInput, selectedPlatform as StreamingPlatform)

    sendToPlatform.then(() => {
      // Add broadcaster message to the chat
      const broadcasterMessage: ChatMessage = {
        id: `broadcaster-${Date.now()}`,
        user: {
          id: "broadcaster",
          username: "You",
          displayName: "You (Broadcaster)",
          platform: selectedPlatform === "all" ? "custom" : (selectedPlatform as StreamingPlatform),
          roles: ["broadcaster"],
          badges: [],
        },
        content: messageInput,
        timestamp: new Date(),
        platform: selectedPlatform === "all" ? "custom" : (selectedPlatform as StreamingPlatform),
        isDeleted: false,
        isHighlighted: false,
        isPinned: false,
        isAction: false,
        emotes: [],
        mentions: [],
      }

      setMessages((prev) => [...prev, broadcasterMessage])
      setMessageInput("")
    })
  }

  const filteredMessages =
    selectedPlatform === "all" ? messages : messages.filter((msg) => msg.platform === selectedPlatform)

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed)
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white dark:bg-gray-950">
      {/* Chat Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/40 dark:to-yellow-950/40">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 text-orange-500 mr-2" />
          <h3 className="font-medium">Platform Chat</h3>
          {isStreaming && (
            <Badge
              variant="outline"
              className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800"
            >
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={togglePanel} className="h-8 w-8">
            {isPanelCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="p-2 border-b">
        <PlatformSelector
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          connectedPlatforms={chatService.getConnectedPlatforms()}
          platformSettings={chatSettings.platformSettings}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <PlatformChatMessage key={message.id} message={message} settings={chatSettings} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-3 border-t">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={isStreaming ? "Type a message..." : "Start streaming to chat"}
                disabled={!isStreaming}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!isStreaming || !messageInput.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Side Panel */}
        {!isPanelCollapsed && (
          <div className="w-64 border-l flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="grid grid-cols-3 p-0 h-10">
                <TabsTrigger value="chat" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="stats" className="text-xs">
                  <BarChart className="h-3 w-3 mr-1" />
                  Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <div className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3 text-xs"
                    onClick={() => setActiveTab("filters")}
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Manage Filters
                  </Button>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium mb-1">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Clear Chat
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Slow Mode
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Followers Only
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Emote Only
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-xs font-medium mb-1">Chat Commands</h4>
                      <div className="space-y-1 text-xs">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded">
                          <span className="font-mono font-bold">!commands</span>
                          <p className="text-gray-600 dark:text-gray-400">Show all commands</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded">
                          <span className="font-mono font-bold">!socials</span>
                          <p className="text-gray-600 dark:text-gray-400">Show social links</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded">
                          <span className="font-mono font-bold">!schedule</span>
                          <p className="text-gray-600 dark:text-gray-400">Show stream schedule</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="users" className="flex-1 m-0 overflow-hidden">
                <PlatformChatUsers
                  platform={selectedPlatform === "all" ? undefined : (selectedPlatform as StreamingPlatform)}
                />
              </TabsContent>

              <TabsContent value="stats" className="flex-1 m-0 overflow-hidden">
                <PlatformChatStats
                  statistics={chatStats}
                  platform={selectedPlatform === "all" ? undefined : (selectedPlatform as StreamingPlatform)}
                />
              </TabsContent>

              <TabsContent value="filters" className="flex-1 m-0 overflow-hidden">
                <PlatformChatFilters onBack={() => setActiveTab("chat")} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <PlatformChatSettings
          settings={chatSettings}
          onSettingsChange={setChatSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  )
}
