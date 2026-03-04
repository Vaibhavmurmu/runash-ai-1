"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Share2, Volume2, VolumeX, Maximize, MessageSquare, ShoppingCart, Users, Eye } from "lucide-react"
import { StreamChat } from "./stream-chat"
import { ProductShowcase } from "./product-showcase"

interface StreamViewerProps {
  streamId: string
}

export function StreamViewer({ streamId }: StreamViewerProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [viewerCount, setViewerCount] = useState(2847)
  const [isFollowing, setIsFollowing] = useState(false)
  const [targetLatencyBufferMs, setTargetLatencyBufferMs] = useState(2200)
  const [streamQuality, setStreamQuality] = useState<"1080p" | "720p" | "480p">("1080p")
  const [stallCount, setStallCount] = useState(0)
  const [stallDurationMs, setStallDurationMs] = useState(0)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [isRebuffering, setIsRebuffering] = useState(false)
  const [sourceStatus, setSourceStatus] = useState<"healthy" | "recovering" | "failed">("healthy")
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [isCatchingUp, setIsCatchingUp] = useState(false)
  const stallStartedAt = useRef<number | null>(null)

  // Simulate viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(0, prev + Math.floor(Math.random() * 20) - 10))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const congestion = Math.random()
      setTargetLatencyBufferMs(congestion > 0.7 ? 3500 : congestion > 0.4 ? 2400 : 1700)
    }, 7000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (sourceStatus !== "healthy") return

      if (Math.random() < 0.22 && !stallStartedAt.current) {
        stallStartedAt.current = Date.now()
        setIsRebuffering(true)
        setStallCount((prev) => prev + 1)
        setStreamQuality((quality) => (quality === "1080p" ? "720p" : "480p"))

        setTimeout(() => {
          if (!stallStartedAt.current) return
          setStallDurationMs((prev) => prev + (Date.now() - stallStartedAt.current))
          stallStartedAt.current = null
          setIsRebuffering(false)
        }, 1000)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [sourceStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      if (sourceStatus === "healthy" && Math.random() < 0.08) {
        setSourceStatus("recovering")
        setRetryAttempt(1)
      }
    }, 12000)

    return () => clearInterval(interval)
  }, [sourceStatus])

  useEffect(() => {
    if (sourceStatus !== "recovering") return

    const timeout = setTimeout(() => {
      const recovered = Math.random() > 0.3 || retryAttempt >= 3
      if (recovered) {
        setSourceStatus("healthy")
        setReconnectCount((prev) => prev + 1)
        setRetryAttempt(0)
        setIsCatchingUp(true)
        setTimeout(() => setIsCatchingUp(false), 4000)
      } else if (retryAttempt >= 4) {
        setSourceStatus("failed")
      } else {
        setRetryAttempt((prev) => prev + 1)
      }
    }, Math.min(5000, retryAttempt * 1000))

    return () => clearTimeout(timeout)
  }, [retryAttempt, sourceStatus])

  useEffect(() => {
    console.info("[qoe] stream-viewer", {
      streamId,
      stallCount,
      stallDurationMs,
      reconnectCount,
      streamQuality,
      targetLatencyBufferMs,
      sourceStatus,
      ts: new Date().toISOString(),
    })
  }, [reconnectCount, sourceStatus, stallCount, stallDurationMs, streamId, streamQuality, targetLatencyBufferMs])

  const retrySource = () => {
    if (sourceStatus === "healthy") return
    setSourceStatus("recovering")
    setRetryAttempt((prev) => Math.max(prev, 1))
  }

  const hardReset = () => {
    setSourceStatus("healthy")
    setRetryAttempt(0)
    setIsRebuffering(false)
    setIsCatchingUp(false)
  }

  const streamData = {
    title: "Organic Skincare Live Show",
    streamer: "RunAsh Beauty",
    category: "Skincare",
    startTime: "2024-01-15T14:30:00Z",
    description:
      "Join us for an exclusive look at our latest organic skincare products! Discover the secrets to healthy, glowing skin with our expert-curated collection.",
  }

  return (
    <div className="space-y-6">
      {/* Stream Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{streamData.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{streamData.streamer}</span>
            <Badge variant="secondary">{streamData.category}</Badge>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {viewerCount.toLocaleString()} viewers
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={isFollowing ? "secondary" : "default"} onClick={() => setIsFollowing(!isFollowing)}>
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Video Player */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black">
                {/* Video placeholder - in real implementation, this would be a video element */}
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">🎥</div>
                    <div className="text-xl font-semibold">Live Stream</div>
                    <div className="text-sm opacity-75">Stream ID: {streamId}</div>
                  </div>
                </div>

                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500 hover:bg-red-600">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                    <Badge variant="secondary">{viewerCount.toLocaleString()} watching</Badge>
                    <Badge variant="secondary">Latency {Math.round(targetLatencyBufferMs / 1000)}s</Badge>
                    <Badge variant="secondary">{streamQuality}</Badge>
                    {isRebuffering && <Badge className="bg-amber-500 hover:bg-amber-600">Rebuffering…</Badge>}
                    {isCatchingUp && <Badge className="bg-blue-500 hover:bg-blue-600">Catch-up</Badge>}
                    {sourceStatus !== "healthy" && (
                      <Badge className={sourceStatus === "failed" ? "bg-red-500 hover:bg-red-600" : "bg-amber-500"}>
                        {sourceStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsLiked(!isLiked)}
                      className={isLiked ? "text-red-500" : ""}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="absolute top-4 right-4 space-y-2 text-right text-xs text-white">
                  <div className="rounded-md bg-black/40 px-2 py-1">
                    QoE: stalls {stallCount} · stall {Math.round(stallDurationMs / 1000)}s · reconnects {reconnectCount}
                  </div>
                  {sourceStatus !== "healthy" && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={retrySource}>
                        Retry
                      </Button>
                      {sourceStatus === "failed" && (
                        <Button size="sm" variant="destructive" onClick={hardReset}>
                          Hard reset
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stream Description */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">About this stream</h3>
              <p className="text-sm text-muted-foreground">{streamData.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>Started: {new Date(streamData.startTime).toLocaleTimeString()}</span>
                <span>Category: {streamData.category}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="products">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Shop
              </TabsTrigger>
              <TabsTrigger value="info">
                <Users className="h-4 w-4 mr-1" />
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <StreamChat isStreaming={true} />
            </TabsContent>

            <TabsContent value="products" className="mt-4">
              <ProductShowcase />
            </TabsContent>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Stream Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Peak viewers</span>
                        <span className="font-medium">{(viewerCount + 234).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Likes</span>
                        <span className="font-medium">1,247</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New followers</span>
                        <span className="font-medium">+89</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration</span>
                        <span className="font-medium">1h 23m</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Streamer</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        RA
                      </div>
                      <div>
                        <div className="font-medium">{streamData.streamer}</div>
                        <div className="text-sm text-muted-foreground">12.5K followers</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
