"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play,
  Pause,
  Square,
  Settings,
  Eye,
  Clock,
  DollarSign,
  Users,
  Video,
  Calendar,
  Plus,
  MoreHorizontal,
  Heart,
  AlertTriangle,
} from "lucide-react"
import { StreamControls } from "./stream-controls"
import { StreamScheduler } from "./stream-scheduler"
import { StreamAnalytics } from "./stream-analytics"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useStreamingStudioRealtime } from "@/lib/hooks/use-streaming-studio-realtime"

const liveStreams = [
  {
    id: "stream-1",
    title: "Organic Skincare Live Show",
    status: "live",
    viewers: 2847,
    duration: "1h 23m",
    revenue: "$1,234",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Skincare",
    aiAgent: "SalesBot Pro",
    startTime: "2024-01-15T14:30:00Z",
  },
  {
    id: "stream-2",
    title: "Wellness Wednesday Special",
    status: "scheduled",
    viewers: 0,
    duration: "0m",
    revenue: "$0",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Wellness",
    aiAgent: "EngageBot",
    startTime: "2024-01-15T18:00:00Z",
  },
  {
    id: "stream-3",
    title: "Product Launch Event",
    status: "ended",
    viewers: 1654,
    duration: "2h 15m",
    revenue: "$2,156",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Launch",
    aiAgent: "LaunchBot",
    startTime: "2024-01-14T16:00:00Z",
  },
] as const

const upcomingStreams = [
  {
    id: "upcoming-1",
    title: "Friday Fitness Focus",
    scheduledTime: "2024-01-16T17:00:00Z",
    category: "Fitness",
    aiAgent: "FitnessBot",
    estimatedViewers: 1200,
  },
  {
    id: "upcoming-2",
    title: "Natural Beauty Secrets",
    scheduledTime: "2024-01-17T15:30:00Z",
    category: "Beauty",
    aiAgent: "BeautyBot",
    estimatedViewers: 1800,
  },
]

export function StreamsDashboard() {
  const streamIds = useMemo(() => liveStreams.map((stream) => stream.id), [])
  const { connected, streams, alerts } = useStreamingStudioRealtime({ initialStreamIds: streamIds })

  const effectiveStreams = liveStreams.map((stream) => {
    const liveState = streams[stream.id]
    return {
      ...stream,
      status: liveState?.status ?? stream.status,
      viewers: liveState?.concurrentViewers ?? stream.viewers,
      engagement: liveState?.engagement,
    }
  })

  const aggregateViewers = effectiveStreams.reduce((acc, stream) => acc + stream.viewers, 0)
  const aggregateEngagement = effectiveStreams.reduce((acc, stream) => {
    const counters = stream.engagement
    if (!counters) return acc
    return acc + counters.likes + counters.comments + counters.shares + counters.reactions
  }, 0)

  const latestAlert = alerts[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500 hover:bg-red-600"
      case "scheduled":
      case "queued":
        return "bg-blue-500 hover:bg-blue-600"
      case "ended":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-muted hover:bg-muted"
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Realtime Status</div>
            <div className="text-xl font-semibold mt-1">{connected ? "Connected" : "Reconnecting..."}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Live Streams</div>
            <div className="text-xl font-semibold mt-1">{effectiveStreams.filter((stream) => stream.status === "live").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Concurrent Viewers</div>
            <div className="text-xl font-semibold mt-1">{aggregateViewers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Engagement Events</div>
            <div className="text-xl font-semibold mt-1">{aggregateEngagement.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {latestAlert ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{latestAlert.message}</span>
            </div>
            <Badge variant="outline" className="border-amber-400 text-amber-900">
              {latestAlert.severity.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button size="lg" className="gap-2">
          <Video className="h-4 w-4" />
          Start New Stream
        </Button>
        <Button variant="outline" size="lg" className="gap-2 bg-transparent">
          <Calendar className="h-4 w-4" />
          Schedule Stream
        </Button>
        <Button variant="outline" size="lg" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
          Stream Settings
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Streams</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6">
            {effectiveStreams.map((stream) => (
              <Card key={stream.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="relative w-48 h-32 bg-muted flex-shrink-0">
                      <img
                        src={stream.thumbnail || "/placeholder.svg"}
                        alt={stream.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className={`absolute top-2 left-2 ${getStatusColor(stream.status)} text-white`}>
                        {stream.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{stream.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {stream.viewers.toLocaleString()} viewers
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {stream.duration}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {stream.revenue}
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {stream.engagement
                                ? `${stream.engagement.likes + stream.engagement.comments + stream.engagement.shares + stream.engagement.reactions} events`
                                : "—"}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Stream</DropdownMenuItem>
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuItem>Download Recording</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete Stream</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{stream.category}</Badge>
                          <Badge variant="outline">{stream.aiAgent}</Badge>
                        </div>

                        <div className="flex gap-2">
                          {stream.status === "live" && (
                            <>
                              <Button variant="outline" size="sm">
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Square className="h-4 w-4 mr-1" />
                                End Stream
                              </Button>
                            </>
                          )}
                          {(stream.status === "scheduled" || stream.status === "queued") && (
                            <>
                              <Button size="sm">
                                <Play className="h-4 w-4 mr-1" />
                                Start Now
                              </Button>
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </>
                          )}
                          {stream.status === "ended" && (
                            <Button variant="outline" size="sm">
                              View Recording
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upcoming Streams</h3>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule New Stream
            </Button>
          </div>

          <div className="grid gap-4">
            {upcomingStreams.map((stream) => (
              <Card key={stream.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold mb-2">{stream.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(stream.scheduledTime).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />~{stream.estimatedViewers} expected viewers
                        </div>
                        <Badge variant="secondary">{stream.category}</Badge>
                        <Badge variant="outline">{stream.aiAgent}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button size="sm">Start Early</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <StreamScheduler />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <StreamAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <StreamControls />
        </TabsContent>
      </Tabs>
    </div>
  )
}
