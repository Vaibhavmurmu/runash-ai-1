"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import StreamControls from "./stream-controls"
import StreamChat from "./stream-chat"
import StreamAnalytics from "./stream-analytics"
import StreamSettings from "./stream-settings"
import StreamStatusBar from "./stream-status-bar"
import ScreenShareWithAnnotations from "./screen-share-with-annotations"
import VirtualBackgrounds from "./virtual-backgrounds"
import MultiPlatformStreaming from "./multi-platform-streaming"
import QuickScheduleButton from "./quick-schedule-button"
import AlertDisplay from "./alerts/alert-display"
import { useRouter } from "next/navigation"
import { StreamingService, type StreamData, type StreamMetrics } from "@/lib/streaming-service"

export default function StreamingStudio() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [streamDuration, setStreamDuration] = useState("00:00:00")
  const [currentStream, setCurrentStream] = useState<StreamData | null>(null)
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics>({
    viewerCount: 0,
    streamHealth: "Excellent",
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    bandwidth: 0,
    latency: 0,
  })
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])
  const router = useRouter()
  const streamingService = StreamingService.getInstance()

  useEffect(() => {
    const unsubscribeStream = streamingService.onStreamChange((stream) => {
      setCurrentStream(stream)
      setIsStreaming(stream?.status === "live")
    })

    const unsubscribeMetrics = streamingService.onMetricsChange((metrics) => {
      setStreamMetrics(metrics)
    })

    return () => {
      unsubscribeStream()
      unsubscribeMetrics()
    }
  }, [streamingService])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isStreaming && currentStream?.startTime) {
      interval = setInterval(() => {
        const startTime = new Date(currentStream.startTime!).getTime()
        const now = Date.now()
        const seconds = Math.floor((now - startTime) / 1000)

        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        setStreamDuration(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
        )
      }, 1000)
    } else {
      setStreamDuration("00:00:00")
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isStreaming, currentStream])

  const handleToggleStream = async () => {
    try {
      if (!isStreaming) {
        // Starting stream - create new stream if none exists
        let stream = currentStream
        if (!stream) {
          stream = await streamingService.createStream(
            "Live Stream",
            "Live streaming session",
            "twitch", // Default platform
          )
        }

        await streamingService.startStream(stream.id)
        setActivePlatforms(["twitch"]) // Example platform
      } else {
        // Ending stream
        if (currentStream) {
          await streamingService.stopStream(currentStream.id)
        }
        setIsRecording(false)
        setActivePlatforms([])
      }
    } catch (error) {
      console.error("Failed to toggle stream:", error)
      // Handle error - show toast notification
    }
  }

  const handleStartRecording = () => {
    setIsRecording(true)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
  }

  const handlePlatformChange = (platforms: string[]) => {
    setActivePlatforms(platforms)
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Streaming Studio</h1>
          <div className="flex items-center space-x-4">
            <QuickScheduleButton />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-0">
                <ScreenShareWithAnnotations isStreaming={isStreaming} />
              </CardContent>
            </Card>

            <StreamStatusBar
              isStreaming={isStreaming}
              streamDuration={streamDuration}
              viewerCount={streamMetrics.viewerCount}
              streamHealth={streamMetrics.streamHealth}
              activePlatforms={activePlatforms}
            />

            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
                <TabsTrigger value="platforms">Platforms</TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="mt-4">
                <StreamChat isStreaming={isStreaming} streamId={currentStream?.id ?? null} />
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <StreamAnalytics isStreaming={isStreaming} metrics={streamMetrics} />
              </TabsContent>
              <TabsContent value="backgrounds" className="mt-4">
                <VirtualBackgrounds />
              </TabsContent>
              <TabsContent value="platforms" className="mt-4">
                <MultiPlatformStreaming isStreaming={isStreaming} onPlatformsChange={handlePlatformChange} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <StreamControls
                  streamId={currentStream?.id ?? null}
                  isStreaming={isStreaming}
                  isRecording={isRecording}
                  metrics={{ bitrate: streamMetrics.bitrate, fps: streamMetrics.fps, latency: streamMetrics.latency }}
                  onToggleStream={handleToggleStream}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <StreamSettings streamId={currentStream?.id ?? null} />
              </CardContent>
            </Card>

            <div className="flex space-x-2">
              <button
                onClick={() => router.push("/alerts")}
                className="flex-1 py-2 px-4 bg-white dark:bg-gray-800 rounded-md border border-orange-200 dark:border-orange-800 text-sm font-medium hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
              >
                Manage Alerts
              </button>
              <button
                onClick={() => router.push("/recordings")}
                className="flex-1 py-2 px-4 bg-white dark:bg-gray-800 rounded-md border border-orange-200 dark:border-orange-800 text-sm font-medium hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
              >
                Recordings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert display component (invisible until alerts are triggered) */}
      <AlertDisplay isStreaming={isStreaming} alertsEnabled={true} queueAlerts={true} alertDelay={2} testMode={false} />
    </div>
  )
}
