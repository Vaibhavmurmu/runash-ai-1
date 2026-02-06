"use client"

import { useState } from "react"
import { Radio, Monitor, Camera } from "lucide-react"
import StreamPreview from "./stream-preview"
import MultiStreamControls from "./multi-stream-controls"
import InputSourceManager from "./input-source-manager"
import { cn } from "@/lib/utils"

export default function LiveStreamManager() {
  const [activeTab, setActiveTab] = useState<"preview" | "channels" | "inputs">("preview")
  const [isLive, setIsLive] = useState(false)
  const [streamData, setStreamData] = useState({
    viewers: 0,
    duration: "00:00:00",
    bitrate: "6 Mbps",
    fps: 60,
  })

  const channels = [
    {
      id: "youtube",
      name: "YouTube",
      status: isLive ? "live" : "offline",
      icon: "▶",
      viewers: 1250,
    },
    {
      id: "twitch",
      name: "Twitch",
      status: isLive ? "live" : "offline",
      icon: "⚡",
      viewers: 856,
    },
    {
      id: "tiktok",
      name: "TikTok",
      status: isLive ? "live" : "offline",
      icon: "♪",
      viewers: 2340,
    },
  ]

  const toggleLive = () => {
    setIsLive(!isLive)
    if (!isLive) {
      setStreamData((prev) => ({ ...prev, viewers: Math.floor(Math.random() * 3000) + 500 }))
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-4 h-4 rounded-full animate-pulse", isLive ? "bg-red-500" : "bg-gray-500")} />
              <h1 className="text-3xl font-bold">{isLive ? "Live Now" : "Ready to Stream"}</h1>
            </div>
            <p className="text-muted-foreground">Multi-platform live streaming dashboard</p>
          </div>
          <button
            onClick={toggleLive}
            className={cn(
              "px-6 py-3 rounded-lg font-semibold transition-colors",
              isLive
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {isLive ? "Stop Streaming" : "Go Live"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: "preview", label: "Preview & Analytics", icon: Monitor },
            { id: "channels", label: "Stream Channels", icon: Radio },
            { id: "inputs", label: "Input Sources", icon: Camera },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === "preview" && <StreamPreview isLive={isLive} streamData={streamData} />}
        {activeTab === "channels" && <MultiStreamControls channels={channels} isLive={isLive} />}
        {activeTab === "inputs" && <InputSourceManager />}
      </div>
    </div>
  )
}
