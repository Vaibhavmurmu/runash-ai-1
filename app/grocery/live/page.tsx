"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Users, ShoppingCart, Heart, Share2, Calendar, Star, TrendingUp, Gift, AlertTriangle, WifiOff } from "lucide-react"
import LiveStreamPlayer from "@/components/grocery/live-shopping/live-stream-player"
import LiveStreamChat from "@/components/grocery/live-shopping/live-stream-chat"
import FeaturedProductCarousel from "@/components/grocery/live-shopping/featured-product-carousel"
import LiveStreamInfo from "@/components/grocery/live-shopping/live-stream-info"
import LiveStreamMetricsDisplay from "@/components/grocery/live-shopping/live-stream-metrics-display"
import UpcomingStreams from "@/components/grocery/live-shopping/upcoming-streams"
import { CurrencyProvider } from "@/contexts/currency-context"

type StreamPageData = {
  stream: {
    id: string
    title: string
    description: string
    hostId: string
    hostName: string
    hostAvatar?: string
    status: "live" | "scheduled" | "ended"
    startTime: string
    viewerCount: number
    maxViewers: number
    category: string
    tags: string[]
    thumbnailUrl: string
    streamUrl: string
    featuredProducts: string[]
    totalSales: number
    totalRevenue: number
  }
  stats: {
    streamId: string
    viewerCount: number
    peakViewers: number
    totalViews: number
    chatMessages: number
    purchases: number
    revenue: number
    averageWatchTime: number
    engagementRate: number
  }
  follow: {
    isFollowing: boolean
  }
}

type ConnectionState = "connecting" | "connected" | "offline"

export default function LiveShoppingPage() {
  const [currentStream, setCurrentStream] = useState<(StreamPageData["stream"] & { startTime: Date }) | null>(null)
  const [streamStats, setStreamStats] = useState<StreamPageData["stats"] | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const streamSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchCurrentStream = async () => {
      setLoading(true)
      setPageError(null)

      try {
        const response = await fetch("/api/streams/live/current", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Unable to fetch current stream")
        }

        const payload = (await response.json()) as StreamPageData
        setCurrentStream({ ...payload.stream, startTime: new Date(payload.stream.startTime) })
        setStreamStats(payload.stats)
        setIsFollowing(payload.follow.isFollowing)
      } catch {
        setPageError("Unable to load live stream right now.")
      } finally {
        setLoading(false)
      }
    }

    void fetchCurrentStream()
  }, [])

  useEffect(() => {
    if (!currentStream?.id) {
      return
    }

    let retryAttempt = 0

    const connect = () => {
      setConnectionState("connecting")
      const source = new EventSource(`/api/analytics/realtime/stream?streamId=${encodeURIComponent(currentStream.id)}`)
      streamSourceRef.current = source

      source.onopen = () => {
        retryAttempt = 0
        setConnectionState("connected")
        setConnectionError(null)
      }

      source.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data)
          setStreamStats((previous) => {
            if (!previous) return previous

            return {
              ...previous,
              viewerCount: metrics.currentViewers ?? previous.viewerCount,
              peakViewers: metrics.peakViewers ?? previous.peakViewers,
              totalViews: metrics.totalViews ?? previous.totalViews,
              chatMessages: metrics.chatMessages ?? previous.chatMessages,
              purchases: metrics.subscriptions ?? previous.purchases,
              revenue: metrics.revenue ?? previous.revenue,
              engagementRate: typeof metrics.engagement === "number" ? metrics.engagement : previous.engagementRate,
            }
          })

          setCurrentStream((previous) =>
            previous
              ? {
                  ...previous,
                  viewerCount: metrics.currentViewers ?? previous.viewerCount,
                  maxViewers: metrics.peakViewers ?? previous.maxViewers,
                }
              : previous,
          )
        } catch {
          setConnectionError("Failed to read live metrics update.")
        }
      }

      source.onerror = () => {
        source.close()
        setConnectionState("offline")
        setConnectionError("Realtime connection interrupted. Reconnecting…")

        const backoff = Math.min(1000 * 2 ** retryAttempt, 30000)
        retryAttempt += 1
        reconnectTimeoutRef.current = setTimeout(connect, backoff)
      }
    }

    connect()

    return () => {
      streamSourceRef.current?.close()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [currentStream?.id])

  const handleFollowToggle = async () => {
    if (!currentStream) return

    setFollowLoading(true)
    try {
      const response = await fetch(`/api/streams/${encodeURIComponent(currentStream.id)}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Unable to update follow status")
      }

      const payload = await response.json()
      setIsFollowing(Boolean(payload.isFollowing))
    } catch {
      setPageError("Could not update follow status. Please retry.")
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="aspect-video bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentStream) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-6 w-24 h-24 mx-auto mb-4">
              <Play className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Live Streams</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {pageError ?? "There are no live streams at the moment. Check out our upcoming streams!"}
            </p>
            <UpcomingStreams />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900">
      <CurrencyProvider>
        <div className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 p-2">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text">Live Shopping</h1>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>LIVE</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{currentStream.viewerCount.toLocaleString()} watching</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleFollowToggle} disabled={followLoading} className={isFollowing ? "bg-purple-100 text-purple-700" : ""}>
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {(pageError || connectionState !== "connected") && (
            <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${connectionState === "offline" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-blue-300 bg-blue-50 text-blue-800"}`}>
              <div className="flex items-center gap-2">
                {connectionState === "offline" ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{pageError ?? connectionError ?? "Connecting to realtime updates…"}</span>
              </div>
            </div>
          )}

          {streamStats && (
            <div className="mb-6">
              <LiveStreamMetricsDisplay stats={streamStats} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LiveStreamPlayer stream={currentStream} />
              <LiveStreamInfo stream={currentStream} />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Featured Products</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">Live Deals</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FeaturedProductCarousel streamId={currentStream.id} featuredProductIds={currentStream.featuredProducts} />
                </CardContent>
              </Card>

              <Tabs defaultValue="products" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="products">All Products</TabsTrigger>
                  <TabsTrigger value="highlights">Highlights</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="products"><Card><CardHeader><CardTitle>All Stream Products</CardTitle></CardHeader><CardContent><div className="text-center py-8 text-gray-500">Browse featured products above to view details and add items to cart.</div></CardContent></Card></TabsContent>
                <TabsContent value="highlights"><Card><CardHeader><CardTitle>Stream Highlights</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><Star className="h-5 w-5 text-yellow-500" /><div><div className="font-medium">Product Spotlight</div><div className="text-sm text-gray-600">Organic produce demo and prep tips.</div></div></div><div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><TrendingUp className="h-5 w-5 text-green-500" /><div><div className="font-medium">Sales Milestone</div><div className="text-sm text-gray-600">Live purchases are updating in real time.</div></div></div><div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><Gift className="h-5 w-5 text-purple-500" /><div><div className="font-medium">Special Offer</div><div className="text-sm text-gray-600">Flash discount now active for featured products.</div></div></div></div></CardContent></Card></TabsContent>
                <TabsContent value="reviews"><Card><CardHeader><CardTitle>Viewer Reviews</CardTitle></CardHeader><CardContent><div className="text-sm text-gray-600">Community reviews are coming soon.</div></CardContent></Card></TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <LiveStreamChat streamId={currentStream.id} />

              <Card>
                <CardHeader><CardTitle className="flex items-center space-x-2"><Calendar className="h-5 w-5" /><span>Upcoming Streams</span></CardTitle></CardHeader>
                <CardContent><UpcomingStreams limit={3} /></CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Stream Stats</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Duration</span><span className="font-medium">{Math.floor((Date.now() - currentStream.startTime.getTime()) / (1000 * 60))} min</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Peak Viewers</span><span className="font-medium">{streamStats?.peakViewers.toLocaleString()}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Products Sold</span><span className="font-medium text-green-600">{streamStats?.purchases ?? currentStream.totalSales}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Revenue</span><span className="font-medium text-green-600">${(streamStats?.revenue ?? currentStream.totalRevenue).toFixed(2)}</span></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CurrencyProvider>
    </div>
  )
}
