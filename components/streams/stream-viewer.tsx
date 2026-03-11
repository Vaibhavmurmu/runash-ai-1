"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Share2, Volume2, VolumeX, Maximize, MessageSquare, ShoppingCart, Users, Eye } from "lucide-react"
import { StreamChat } from "./stream-chat"
import { ProductShowcase } from "./product-showcase"
import {
  type SourceStatus,
  type StreamQuality,
  buildViewerTelemetryPayload,
  nextViewerQoeState,
} from "@/lib/streams/stream-viewer-playback"

interface StreamViewerProps {
  streamId: string
}

export function resolvePlaybackUrl(input: { stream?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null }) {
  const metadata = input.metadata ?? {}
  const stream = input.stream ?? {}

  const metadataRecord = metadata as Record<string, unknown>
  const providerRecord = (metadataRecord.provider as Record<string, unknown> | undefined) ?? {}
  const playbackList = providerRecord.playbackUrls

  const candidates: Array<unknown> = [
    metadataRecord.playbackUrl,
    (metadataRecord.playback as Record<string, unknown> | undefined)?.url,
    providerRecord.playbackUrl,
    Array.isArray(playbackList) ? (playbackList[0] as Record<string, unknown> | undefined)?.url : null,
    (stream as Record<string, unknown>).playback_url,
    (stream as Record<string, unknown>).playbackUrl,
  ]

  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? ""
}

function qualityFromVideo(video: HTMLVideoElement | null): StreamQuality {
  const height = video?.videoHeight ?? 0
  if (height >= 1080) return "1080p"
  if (height >= 720) return "720p"
  return "480p"
}

export function StreamViewer({ streamId }: StreamViewerProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [targetLatencyBufferMs, setTargetLatencyBufferMs] = useState(0)
  const [streamQuality, setStreamQuality] = useState<StreamQuality>("480p")
  const [stallCount, setStallCount] = useState(0)
  const [stallDurationMs, setStallDurationMs] = useState(0)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [isRebuffering, setIsRebuffering] = useState(false)
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>("healthy")
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [isCatchingUp, setIsCatchingUp] = useState(false)
  const [chatConnected, setChatConnected] = useState(false)
  const [chatMessages, setChatMessages] = useState(0)
  const [activePollCount, setActivePollCount] = useState(0)
  const [playbackUrl, setPlaybackUrl] = useState("")

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stallStartedAt = useRef<number | null>(null)

  const emitTelemetry = useCallback(
    (eventType: "waiting" | "stalled" | "playing" | "error" | "reconnect_attempt" | "recovered", status: SourceStatus) => {
      if (!playbackUrl) return

      const payload = buildViewerTelemetryPayload(
        {
          sourceStatus: status,
          stallCount,
          stallDurationMs,
          reconnectCount,
          streamQuality,
          targetLatencyBufferMs,
          retryAttempt,
          isRebuffering,
          isCatchingUp,
        },
        { eventType, playbackUrl },
      )

      void fetch(`/api/streams/${streamId}/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    },
    [
      isCatchingUp,
      isRebuffering,
      playbackUrl,
      reconnectCount,
      retryAttempt,
      stallCount,
      stallDurationMs,
      streamId,
      streamQuality,
      targetLatencyBufferMs,
    ],
  )

  useEffect(() => {
    let cancelled = false

    const hydratePlayback = async () => {
      const [streamResponse, metadataResponse, followResponse] = await Promise.all([
        fetch(`/api/streams/${streamId}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/streams/${streamId}/metadata`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/streams/${streamId}/follow`, { cache: "no-store" }).catch(() => null),
      ])

      const streamJson = streamResponse && streamResponse.ok ? ((await streamResponse.json()) as { data?: { stream?: Record<string, unknown> } }) : null
      const metadataJson =
        metadataResponse && metadataResponse.ok
          ? ((await metadataResponse.json()) as { data?: { metadata?: Record<string, unknown> } })
          : null

      const followJson = followResponse && followResponse.ok ? ((await followResponse.json()) as { isFollowing?: boolean }) : null

      if (cancelled) return
      setPlaybackUrl(resolvePlaybackUrl({ stream: streamJson?.data?.stream, metadata: metadataJson?.data?.metadata }))
      setIsFollowing(Boolean(followJson?.isFollowing))
    }

    void hydratePlayback()

    return () => {
      cancelled = true
    }
  }, [streamId])

  useEffect(() => {
    const metricsSse = new EventSource(`/api/streams/metrics/stream?streamIds=${encodeURIComponent(streamId)}`)
    const onMetrics = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as { entries?: Array<{ streamId: string; viewerCount: number }> }
      const entry = payload.entries?.find((item) => item.streamId === streamId)
      if (entry) setViewerCount(entry.viewerCount)
    }

    metricsSse.addEventListener("metrics", onMetrics)

    return () => {
      metricsSse.removeEventListener("metrics", onMetrics)
      metricsSse.close()
    }
  }, [streamId])

  useEffect(() => {
    const chatSse = new EventSource(`/api/streams/${streamId}/chat/sse`)
    setChatConnected(true)

    chatSse.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; data?: unknown[] }
      if (payload.type === "messages") {
        setChatMessages((current) => current + (Array.isArray(payload.data) ? payload.data.length : 0))
      }
    }

    chatSse.onerror = () => setChatConnected(false)

    return () => {
      chatSse.close()
      setChatConnected(false)
    }
  }, [streamId])

  useEffect(() => {
    const pollsSse = new EventSource(`/api/streams/${streamId}/polls/sse`)
    pollsSse.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; data?: Array<{ status?: string }> }
      if (payload.type !== "polls") return
      setActivePollCount(payload.data?.filter((poll) => poll.status === "open").length ?? 0)
    }

    return () => {
      pollsSse.close()
    }
  }, [streamId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onStall = (eventType: "waiting" | "stalled") => {
      if (!stallStartedAt.current) {
        stallStartedAt.current = Date.now()
        const next = nextViewerQoeState(
          { sourceStatus, stallCount, stallDurationMs, reconnectCount, retryAttempt, isRebuffering, isCatchingUp, streamQuality, targetLatencyBufferMs },
          { eventType },
        )
        setStallCount(next.stallCount)
      }

      setIsRebuffering(true)
      setSourceStatus("recovering")
      emitTelemetry(eventType, "recovering")
    }

    const onPlaying = () => {
      setStreamQuality(qualityFromVideo(video))

      if (stallStartedAt.current) {
        const elapsed = Date.now() - stallStartedAt.current
        setStallDurationMs((current) => current + elapsed)
        stallStartedAt.current = null
      }

      if (sourceStatus !== "healthy") {
        setReconnectCount((current) => current + 1)
        setIsCatchingUp(true)
        emitTelemetry("recovered", "healthy")
      }

      setTimeout(() => setIsCatchingUp(false), 3000)
      setIsRebuffering(false)
      setSourceStatus("healthy")
      emitTelemetry("playing", "healthy")
    }

    const onError = () => {
      setSourceStatus("failed")
      emitTelemetry("error", "failed")
    }

    const onTimeUpdate = () => {
      const end = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : video.currentTime
      const latencyMs = Math.max(0, Math.round((end - video.currentTime) * 1000))
      setTargetLatencyBufferMs(latencyMs)
    }

    const onWaiting = () => onStall("waiting")
    const onStalled = () => onStall("stalled")

    video.addEventListener("waiting", onWaiting)
    video.addEventListener("stalled", onStalled)
    video.addEventListener("playing", onPlaying)
    video.addEventListener("error", onError)
    video.addEventListener("timeupdate", onTimeUpdate)

    return () => {
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("error", onError)
      video.removeEventListener("timeupdate", onTimeUpdate)
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("stalled", onStalled)
    }
  }, [
    emitTelemetry,
    isCatchingUp,
    isRebuffering,
    reconnectCount,
    retryAttempt,
    sourceStatus,
    stallCount,
    stallDurationMs,
    streamQuality,
    targetLatencyBufferMs,
  ])

  const retrySource = async () => {
    if (!videoRef.current) return

    setSourceStatus("recovering")
    setRetryAttempt((current) => current + 1)
    emitTelemetry("reconnect_attempt", "recovering")

    await videoRef.current.play().catch(() => null)
  }

  const hardReset = () => {
    if (!videoRef.current) return

    videoRef.current.load()
    setSourceStatus("recovering")
    setRetryAttempt(0)
    setIsRebuffering(false)
    setIsCatchingUp(false)
  }

  const streamData = useMemo(
    () => ({
      title: "Organic Skincare Live Show",
      streamer: "RunAsh Beauty",
      category: "Skincare",
      startTime: "2024-01-15T14:30:00Z",
      description:
        "Join us for an exclusive look at our latest organic skincare products! Discover the secrets to healthy, glowing skin with our expert-curated collection.",
    }),
    [],
  )

  return (
    <div className="space-y-6">
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
          <Button
            variant={isFollowing ? "secondary" : "default"}
            onClick={async () => {
              const response = await fetch(`/api/streams/${streamId}/follow`, { method: "POST" }).catch(() => null)
              if (!response?.ok) return
              const payload = (await response.json()) as { isFollowing: boolean }
              setIsFollowing(payload.isFollowing)
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black">
                {playbackUrl ? (
                  <video
                    ref={videoRef}
                    className="h-full w-full"
                    src={playbackUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    controls
                    data-testid="stream-playback"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-xl font-semibold">Playback pending</div>
                      <div className="text-sm opacity-75">Stream ID: {streamId}</div>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500 hover:bg-red-600">LIVE</Badge>
                    <Badge variant="secondary">{viewerCount.toLocaleString()} watching</Badge>
                    <Badge variant="secondary">Latency {Math.round(targetLatencyBufferMs / 1000)}s</Badge>
                    <Badge variant="secondary">{streamQuality}</Badge>
                    <Badge variant={chatConnected ? "secondary" : "destructive"}>Chat {chatConnected ? "live" : "reconnecting"}</Badge>
                    <Badge variant="secondary">Polls {activePollCount}</Badge>
                    {isRebuffering && <Badge className="bg-amber-500 hover:bg-amber-600">Rebuffering…</Badge>}
                    {isCatchingUp && <Badge className="bg-blue-500 hover:bg-blue-600">Catch-up</Badge>}
                    {sourceStatus !== "healthy" && (
                      <Badge className={sourceStatus === "failed" ? "bg-red-500 hover:bg-red-600" : "bg-amber-500"}>{sourceStatus}</Badge>
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
                    QoE: stalls {stallCount} · stall {Math.round(stallDurationMs / 1000)}s · reconnects {reconnectCount} · chat {chatMessages}
                  </div>
                  {sourceStatus !== "healthy" && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void retrySource()}>
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
                        <span className="font-medium">{Math.max(viewerCount, 0).toLocaleString()}</span>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
