"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Sparkles,
  Upload,
  Languages,
  MessageCircle,
} from "lucide-react"
import { StreamControls } from "./stream-controls"
import { StreamScheduler } from "./stream-scheduler"
import { StreamAnalytics } from "./stream-analytics"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useStreamingStudioRealtime } from "@/lib/hooks/use-streaming-studio-realtime"
import type { AnalyticsDataset } from "@/lib/analytics-pro"
import {
  createAnalyticsDataset,
  createStudioRecording,
  deleteAnalyticsDataset,
  listAnalyticsDatasets,
  saveStudioConsent,
} from "@/lib/streams-studio-pro-client"
import { createStreamSession, startStreamSession } from "@/lib/stream-session-contract"
import { toast } from "sonner"

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
  const searchParams = useSearchParams()
  const [presetLabel, setPresetLabel] = useState<string | null>(null)
  const [datasetName, setDatasetName] = useState("")
  const [datasets, setDatasets] = useState<AnalyticsDataset[]>([])
  const [streamSessionId, setStreamSessionId] = useState<string | null>(null)
  const [automationTimeline, setAutomationTimeline] = useState<Array<{
    id: string
    eventType: string
    stage: "intermediate" | "final"
    createdAt: string
    eventPayload: Record<string, unknown>
  }>>([])
  const [savingConsent, setSavingConsent] = useState(false)
  const [consent, setConsent] = useState({
    allowMic: true,
    allowCamera: true,
    allowScreenShare: true,
    allowRecording: true,
    preferredLanguage: "en" as const,
  })
  const libraryItemTitle = searchParams.get("libraryItemTitle")

  useEffect(() => {
    const fromQuery = searchParams.get("projectName")
    if (fromQuery) {
      setPresetLabel(fromQuery)
      return
    }

    const stored = localStorage.getItem("runash_streaming_preset")
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { projectName?: string; title?: string }
      setPresetLabel(parsed.projectName ?? parsed.title ?? null)
    } catch {
      setPresetLabel(null)
    }
  }, [searchParams])

  useEffect(() => {
    const hydrateDatasets = async () => {
      try {
        const payload = await listAnalyticsDatasets()
        setDatasets(payload.datasets)
      } catch {
        setDatasets([])
      }
    }
    void hydrateDatasets()
  }, [])


  useEffect(() => {
    if (!streamSessionId) return

    let cancelled = false
    const loadTimeline = async () => {
      try {
        const response = await fetch(`/api/streams/sessions/${streamSessionId}/automation`, { cache: "no-store" })
        if (!response.ok) return
        const payload = (await response.json()) as {
          events?: Array<{
            id: string
            eventType: string
            stage: "intermediate" | "final"
            createdAt: string
            eventPayload: Record<string, unknown>
          }>
        }
        if (!cancelled) {
          setAutomationTimeline(
            (payload.events ?? []).filter((event) =>
              event.eventType.startsWith("stream_automation.network_quality") || event.eventType === "stream_automation.state_snapshot",
            ),
          )
        }
      } catch {
        if (!cancelled) setAutomationTimeline([])
      }
    }

    void loadTimeline()
    const timer = setInterval(() => void loadTimeline(), 10_000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [streamSessionId])

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


  const triggerNetworkAutomation = async (trigger: "network_quality_degraded" | "network_quality_recovered") => {
    if (!streamSessionId) {
      toast.error("Start live session first")
      return
    }

    try {
      const response = await fetch(`/api/streams/sessions/${streamSessionId}/automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: trigger,
        }),
      })
      if (!response.ok) throw new Error("request_failed")
      toast.success(trigger === "network_quality_degraded" ? "Connection optimization triggered" : "Gradual profile restore triggered")
    } catch {
      toast.error("Failed to trigger network automation")
    }
  }

  const handleGoLiveWithConsent = async () => {
    try {
      setSavingConsent(true)
      const session = await createStreamSession({ title: "Studio Pro Live Session", platform: "multiplatform" })
      setStreamSessionId(session.session.id)
      await saveStudioConsent(session.session.id, consent)
      await startStreamSession(session.session.id)
      toast.success("Live stream started with consent and device permissions")
    } catch {
      toast.error("Unable to start live session")
    } finally {
      setSavingConsent(false)
    }
  }

  const handleDatasetCreate = async () => {
    if (!datasetName.trim()) return
    try {
      const created = await createAnalyticsDataset({
        name: datasetName,
        description: "Uploaded analytics-ready stream dataset.",
        records: 0,
        source: "upload",
        tags: ["analytics-pro", "upload"],
      })
      setDatasets((prev) => [created.dataset, ...prev])
      setDatasetName("")
      toast.success("Dataset added")
    } catch {
      toast.error("Unable to add dataset")
    }
  }

  const handleDatasetDelete = async (id: string) => {
    try {
      await deleteAnalyticsDataset(id)
      setDatasets((prev) => prev.filter((dataset) => dataset.id !== id))
      toast.success("Dataset removed")
    } catch {
      toast.error("Unable to remove dataset")
    }
  }

  const handleSaveRecording = async (storage: "cloud" | "local") => {
    if (!streamSessionId) {
      toast.error("Start live session first")
      return
    }
    try {
      await createStudioRecording(streamSessionId, {
        streamId: streamSessionId,
        title: "Studio Pro Recording",
        durationSeconds: 120,
        includeTranscript: true,
        storage,
      })
      toast.success(`Recording saved to ${storage} library`)
    } catch {
      toast.error("Failed to save recording")
    }
  }

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

      {presetLabel || libraryItemTitle ? (
        <Card className="border-orange-300 bg-orange-50/70">
          <CardContent className="p-4 flex flex-wrap items-center gap-2 text-sm">
            {presetLabel ? <Badge variant="secondary">Project preset: {presetLabel}</Badge> : null}
            {libraryItemTitle ? <Badge variant="outline">Library item: {libraryItemTitle}</Badge> : null}
          </CardContent>
        </Card>
      ) : null}


      {streamSessionId ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Automation Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {automationTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No network automation events yet for this session.</p>
            ) : (
              automationTimeline.slice(-8).map((event) => (
                <div key={event.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{event.eventType}</div>
                  <div className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</div>
                  {event.eventPayload.message ? <div className="mt-1">{String(event.eventPayload.message)}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
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
        {streamSessionId ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => void triggerNetworkAutomation("network_quality_degraded")}>
              Simulate degraded network
            </Button>
            <Button variant="outline" size="lg" onClick={() => void triggerNetworkAutomation("network_quality_recovered")}>
              Simulate network recovery
            </Button>
          </>
        ) : null}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Streams</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="studio-pro">Studio Pro</TabsTrigger>
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

        <TabsContent value="studio-pro" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Video className="h-4 w-4" /> Live streaming consent
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable camera, mic, screen sharing, and bilingual (Hindi/English) speech recognition consent before going live.
                </p>
                <div className="grid gap-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={consent.allowMic} onChange={(e) => setConsent((prev) => ({ ...prev, allowMic: e.target.checked }))} />Allow mic</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={consent.allowCamera} onChange={(e) => setConsent((prev) => ({ ...prev, allowCamera: e.target.checked }))} />Allow camera</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={consent.allowScreenShare} onChange={(e) => setConsent((prev) => ({ ...prev, allowScreenShare: e.target.checked }))} />Allow screen sharing</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={consent.allowRecording} onChange={(e) => setConsent((prev) => ({ ...prev, allowRecording: e.target.checked }))} />Allow live recording</label>
                </div>
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <select
                    value={consent.preferredLanguage}
                    onChange={(e) => setConsent((prev) => ({ ...prev, preferredLanguage: e.target.value === "hi" ? "hi" : "en" }))}
                    className="rounded border bg-background px-2 py-1 text-sm"
                  >
                    <option value="en">English transcription</option>
                    <option value="hi">Hindi transcription</option>
                  </select>
                </div>
                <Button className="w-full" onClick={() => void handleGoLiveWithConsent()} disabled={savingConsent}>
                  {savingConsent ? "Starting..." : "Go Live with consent"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Upload className="h-4 w-4" /> Stream upload & recording library
                </div>
                <p className="text-sm text-muted-foreground">Save live recordings to cloud or local storage with transcript job queue.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void handleSaveRecording("local")}>Save Local</Button>
                  <Button variant="outline" onClick={() => void handleSaveRecording("cloud")}>Save Cloud</Button>
                </div>
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                  AI Chat Assistant notifications, stream health checks, full-view player mode, multi-platform & multi-host sync are available in Studio Pro controls.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" /> Analytics Pro datasets (CRUD)
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="datasetName">Dataset name</Label>
                  <Input id="datasetName" value={datasetName} onChange={(event) => setDatasetName(event.target.value)} placeholder="ex: Audience spikes - weekend" />
                </div>
                <Button onClick={() => void handleDatasetCreate()}>Create dataset</Button>
              </div>
              <div className="grid gap-2">
                {datasets.map((dataset) => (
                  <div key={dataset.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">{dataset.name}</div>
                      <div className="text-xs text-muted-foreground">{dataset.source} • {dataset.records.toLocaleString()} records</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => void handleDatasetDelete(dataset.id)}>Delete</Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> Chat assistant can use these datasets for alerts, audience insights, and scheduling recommendations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <StreamControls />
        </TabsContent>
      </Tabs>
    </div>
  )
}
