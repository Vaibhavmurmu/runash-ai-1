"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Video, Calendar, Clock, Users, Settings, Mail, Link as LinkIcon, RotateCcw, Sparkles, BarChart3, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { RecordingService } from "@/lib/recording-service"
import { dashboardStreamingService } from "@/lib/streaming-service"
import type { DashboardRecentStream, DashboardScheduledStream, LatestCompletedStreamSummary } from "@/lib/types/dashboard-streams"
import { useStreamingStudioRealtime, type StreamingStudioRealtimeStreamState } from "@/lib/hooks/use-streaming-studio-realtime"

const getCanonicalStreamUrl = (id: string, url?: string) => url || `/stream/${id}`

const getAppHrefFromStreamUrl = (id: string, url?: string) => {
  const canonicalUrl = getCanonicalStreamUrl(id, url)

  try {
    const parsed = new URL(canonicalUrl)
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return canonicalUrl
  }
}


function formatModuleUpdatedLabel(value?: string | null) {
  if (!value) return "Last updated: no recent activity"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return `Last updated: ${value}`
  return `Last updated: ${parsed.toLocaleString()}`
}

type StreamTemplateCardProps = {
  primaryAction: ReactNode
  onResume: () => void
  resumeDisabled: boolean
  continuityLabel: string
  updatedLabel: string
}

function StreamTemplateCard({ primaryAction, onResume, resumeDisabled, continuityLabel, updatedLabel }: StreamTemplateCardProps) {
  return (
    <Card className="border-border/40 md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Streaming module</CardTitle>
        <CardDescription>Use the common workflow template: launch, continue previous live context, and verify recency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {primaryAction}
        <Button variant="outline" className="w-full" onClick={onResume} disabled={resumeDisabled}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {continuityLabel}
        </Button>
        <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{updatedLabel}</div>
      </CardContent>
    </Card>
  )
}

export function StreamQuickAccess() {
  const router = useRouter()
  const [streamTitle, setStreamTitle] = useState("")
  const [streamCategory, setStreamCategory] = useState("gaming")
  const [recentStreams, setRecentStreams] = useState<DashboardRecentStream[]>([])
  const [scheduledStreams, setScheduledStreams] = useState<DashboardScheduledStream[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [streamLoadError, setStreamLoadError] = useState<string | null>(null)
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number | null>(null)
  const [lastRealtimeSnapshot, setLastRealtimeSnapshot] = useState<Record<string, StreamingStudioRealtimeStreamState>>({})

  // Scheduling
  const [scheduleTitle, setScheduleTitle] = useState("")
  const [scheduleCategory, setScheduleCategory] = useState("gaming")
  const [scheduleDateTime, setScheduleDateTime] = useState("")

  // Invite
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteStreamId, setInviteStreamId] = useState<string | null>(null)

  // Integration
  const [integrationKey, setIntegrationKey] = useState<string | null>(null)
  const [integrating, setIntegrating] = useState(false)
  const [recentRecordingEditHref, setRecentRecordingEditHref] = useState("/recordings")
  const [latestSummary, setLatestSummary] = useState<LatestCompletedStreamSummary | null>(null)
  const [startDialogOpen, setStartDialogOpen] = useState(false)

  const initialStreamIds = useMemo(() => recentStreams.map((stream) => stream.id), [recentStreams])
  const { connected, streams: streamRealtime, alerts, subscribe } = useStreamingStudioRealtime({ initialStreamIds })

  useEffect(() => {
    initialStreamIds.forEach((streamId) => subscribe(streamId))
  }, [initialStreamIds, subscribe])

  const effectiveRealtimeState = connected ? streamRealtime : lastRealtimeSnapshot

  const effectiveRecentStreams = useMemo(
    () =>
      recentStreams.map((stream) => {
        const realtime = effectiveRealtimeState[stream.id]
        return {
          ...stream,
          status: (realtime?.status as DashboardRecentStream["status"] | undefined) ?? stream.status,
          viewers: realtime?.concurrentViewers ?? stream.viewers,
        }
      }),
    [effectiveRealtimeState, recentStreams],
  )

  useEffect(() => {
    void fetchStreams()
  }, [])


  useEffect(() => {
    if (!connected) return
    if (Object.keys(streamRealtime).length === 0) return
    setLastRealtimeSnapshot(streamRealtime)
    setLastSnapshotAt(Date.now())
  }, [connected, streamRealtime])

  const fetchStreams = async () => {
    setLoading(true)
    setStreamLoadError(null)
    try {
      const [recentJson, scheduledJson, summaryJson] = await Promise.all([
        dashboardStreamingService.fetchRecentStreams(),
        dashboardStreamingService.fetchScheduledStreams(),
        dashboardStreamingService.fetchLatestCompletedStreamSummary(),
      ])

      setRecentStreams(Array.isArray(recentJson.streams) ? recentJson.streams : [])
      setScheduledStreams(Array.isArray(scheduledJson.streams) ? scheduledJson.streams : [])
      setLatestSummary(summaryJson.summary ?? null)

      try {
        const recordings = await RecordingService.getInstance().getUserRecordings()
        const latestRecording = recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        setRecentRecordingEditHref(latestRecording?.id ? `/recordings?recordingId=${encodeURIComponent(latestRecording.id)}&mode=edit` : "/recordings")
      } catch {
        setRecentRecordingEditHref("/recordings")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load streams."
      setStreamLoadError(message)
      toast({ title: "Error", description: message })
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }


  const handleStartStream = async () => {
    if (!streamTitle) {
      toast({ title: "Missing Title", description: "Please enter a stream title." })
      return false
    }

    try {
      setLoading(true)
      const data = await dashboardStreamingService.startStream({ title: streamTitle, category: streamCategory })
      toast({
        title: "Stream Started",
        description: `Your stream "${streamTitle}" is now live.`,
      })

      // Update recent streams locally
      setRecentStreams((r) => [
        {
          id: data.id,
          title: data.title,
          category: data.category,
          date: data.startedAt,
          viewers: 0,
          duration: null,
          status: data.status,
          url: data.url,
        },
        ...r,
      ])
      setStreamTitle("")
      // Navigate to stream detail/player page (adjust route to your app)
      router.push(getAppHrefFromStreamUrl(data.id, data.url))
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not start stream."
      toast({ title: "Error", description: message })
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleStream = async () => {
    if (!scheduleTitle || !scheduleDateTime) {
      toast({ title: "Missing Data", description: "Please provide title and date/time for scheduling." })
      return
    }

    try {
      setLoading(true)
      const newScheduled = await dashboardStreamingService.scheduleStream({
        title: scheduleTitle,
        category: scheduleCategory,
        startsAt: scheduleDateTime,
      })
      toast({ title: "Scheduled", description: `${newScheduled.title} scheduled for ${newScheduled.startsAt}` })
      setScheduledStreams((s) => [newScheduled, ...s])
      setScheduleTitle("")
      setScheduleDateTime("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not schedule stream."
      toast({ title: "Error", description: message })
    } finally {
      setLoading(false)
    }
  }

  const handleInviteCollaborator = async () => {
    if (!inviteEmail || !inviteStreamId) {
      toast({ title: "Missing Data", description: "Select a stream and provide an email." })
      return
    }

    try {
      setLoading(true)
      await dashboardStreamingService.inviteCollaborator({ streamId: inviteStreamId, email: inviteEmail })

      toast({ title: "Invite Sent", description: `Invitation sent to ${inviteEmail}` })
      setInviteEmail("")
      setInviteStreamId(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send invite."
      toast({ title: "Error", description: message })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchIntegrationKey = async () => {
    try {
      setIntegrating(true)
      const data = await dashboardStreamingService.fetchIntegrationKey()
      setIntegrationKey(data.rtmpKey)
      toast({ title: "Integration Ready", description: "Received RTMP key." })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not get integration."
      toast({ title: "Error", description: message })
    } finally {
      setIntegrating(false)
    }
  }

  const lastLiveStream = effectiveRecentStreams.find((stream) => stream.status === "live" || stream.status === "ended")

  const handleOpenPreviousLiveSessionContext = async () => {
    try {
      const restore = await dashboardStreamingService.restoreLastStreamConfigurationDraft()
      const targetId = restore.draft?.streamId ?? (await dashboardStreamingService.openPreviousLiveSessionContext())

      if (!targetId) {
        toast({ title: "Resume unavailable", description: "No recent or scheduled stream configuration found." })
        return
      }

      router.push(`/stream?resumeStreamId=${encodeURIComponent(targetId)}`)
    } catch {
      toast({ title: "Resume unavailable", description: "Unable to load stream configuration." })
    }
  }

  const handleReplayAnalytics = async () => {
    const streamId = lastLiveStream?.id

    if (!streamId) {
      toast({ title: "Analytics unavailable", description: "No recent live stream found." })
      return
    }

    try {
      await dashboardStreamingService.fetchStreamDetails(streamId)
    } catch {
      toast({ title: "Analytics unavailable", description: "Unable to load stream details." })
      return
    }

    router.push(`/analytics/streams?streamId=${encodeURIComponent(streamId)}&replay=1`)
  }

  const handleCreateHighlightsFromLastStream = async () => {
    if (!latestSummary?.streamId && !lastLiveStream?.id) {
      toast({ title: "Highlights unavailable", description: "No completed live stream found." })
      return
    }

    try {
      await dashboardStreamingService.createFollowUpFromPreviousLiveSession()
      const sourceStreamId = latestSummary?.streamId ?? lastLiveStream?.id
      const recordings = await RecordingService.getInstance().getUserRecordings(sourceStreamId)
      const linkedRecording = recordings.find((recording) => recording.streamId === sourceStreamId) ?? recordings[0]

      if (!linkedRecording?.id) {
        toast({ title: "Follow-up created", description: "Highlight job queued from your previous live session." })
        return
      }

      router.push(`/recordings?recordingId=${encodeURIComponent(linkedRecording.id)}&panel=highlights`)
    } catch {
      toast({ title: "Highlights unavailable", description: "Unable to load recording for the last stream." })
    }
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Streaming
        </CardTitle>
        <CardDescription>Start a new stream, schedule broadcasts, invite collaborators, or integrate with your encoder</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Studio realtime</span>
          <Badge variant={connected ? "default" : "secondary"}>{connected ? "Connected" : "Reconnecting"}</Badge>
        </div>
        {alerts[0] ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <span>{alerts[0].message}</span>
          </div>
        ) : null}
        {!connected && (
          <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>Realtime disconnected. Showing last snapshot{lastSnapshotAt ? ` from ${new Date(lastSnapshotAt).toLocaleTimeString()}` : ""}.</span>
            <Button size="sm" variant="outline" onClick={() => void fetchStreams()} disabled={loading} className="h-7">
              Refresh now
            </Button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <StreamTemplateCard
            primaryAction={
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                disabled={loading}
                onClick={() => setStartDialogOpen(true)}
              >
                <Video className="mr-2 h-4 w-4" />
                Go Live
              </Button>
            }
            onResume={handleOpenPreviousLiveSessionContext}
            resumeDisabled={!lastLiveStream?.id && !latestSummary?.streamId}
            continuityLabel={lastLiveStream?.title ? `Resume previous live: ${lastLiveStream.title}` : "Resume previous live"}
            updatedLabel={formatModuleUpdatedLabel(latestSummary?.completedAt ?? lastLiveStream?.date)}
          />

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last live summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground line-clamp-1">{latestSummary?.title ?? lastLiveStream?.title ?? "No live session yet"}</p>
              <p>
                Viewers: {Number((latestSummary?.keyMetrics?.peakViewers as number | undefined) ?? lastLiveStream?.viewers ?? 0).toLocaleString()}
              </p>
              <p>Alerts: {latestSummary?.unresolvedAlerts?.length ?? 0} unresolved</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Post-live actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleCreateHighlightsFromLastStream}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate highlights
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleReplayAnalytics}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Replay analytics
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push(recentRecordingEditHref)}>
                Open recent recording edit
              </Button>
            </CardContent>
          </Card>
        </div>
        {/* Start Live Dialog */}
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Live Stream</DialogTitle>
              <DialogDescription>Configure your stream settings and go live in seconds.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stream-title">Stream Title</Label>
                <Input
                  id="stream-title"
                  placeholder="Enter your stream title..."
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <RadioGroup value={streamCategory} onValueChange={setStreamCategory}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gaming" id="gaming" />
                    <Label htmlFor="gaming">Grocery</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education">Sustainable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education">Recipes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education">Gaming</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education">Education</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="technology" id="technology" />
                    <Label htmlFor="technology">Technology</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="entertainment" id="entertainment" />
                    <Label htmlFor="entertainment">Entertainment</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                onClick={async () => {
                  const started = await handleStartStream()
                  if (started) setStartDialogOpen(false)
                }}
                disabled={loading}
              >
                Start Streaming
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Stream - inline controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule a Stream
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Title" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} />
            <Input type="datetime-local" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} />
            <div className="flex items-center space-x-2">
              <select value={scheduleCategory} onChange={(e) => setScheduleCategory(e.target.value)} className="rounded-md border px-2 py-1">
                <option value="gaming">Grocery</option>
                <option value="gaming">Sustainable</option>
                <option value="gaming">Recipes</option>
                <option value="gaming">Gaming</option>
                <option value="education">Education</option>
                <option value="technology">Technology</option>
                <option value="entertainment">Entertainment</option>
              </select>
              <Button onClick={handleScheduleStream} disabled={loading}>
                Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Invite collaborators */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invite Collaborators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <select
              value={inviteStreamId ?? ""}
              onChange={(e) => setInviteStreamId(e.target.value || null)}
              className="rounded-md border px-2 py-1"
            >
              <option value="">Select a stream (scheduled or recent)</option>
              {scheduledStreams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {new Date(s.startsAt).toLocaleString()}
                </option>
              ))}
              {recentStreams.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.date}
                </option>
              ))}
            </select>
            <Input placeholder="collaborator@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Button onClick={handleInviteCollaborator} disabled={loading}>
              Send Invite
            </Button>
          </div>
        </div>

        {/* Recent Streams */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent Streams</h3>
          <div className="space-y-2">
            {initialLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : streamLoadError ? (
              <div className="text-xs text-destructive">Unable to load recent streams. Use refresh to retry.</div>
            ) : effectiveRecentStreams.length === 0 ? (
              <div className="text-xs text-muted-foreground">No recent streams yet.</div>
            ) : (
              effectiveRecentStreams.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium truncate">{stream.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{stream.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stream.duration ?? "—"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {stream.viewers ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stream.url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(stream.url, "_blank")}>
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Streams */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Upcoming Streams</h3>
          <div className="space-y-2">
            {initialLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : streamLoadError ? (
              <div className="text-xs text-destructive">Unable to load scheduled streams. Use refresh to retry.</div>
            ) : scheduledStreams.length === 0 ? (
              <div className="text-xs text-muted-foreground">No upcoming streams scheduled.</div>
            ) : (
              scheduledStreams.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium truncate">{stream.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(stream.startsAt).toLocaleString()}</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      >
                        Scheduled
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      const link = getCanonicalStreamUrl(stream.id, stream.url)
                      navigator.clipboard.writeText(link)
                      toast({ title: "Link Copied", description: link })
                    }}>
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <div className="w-full flex gap-2">
          <Button variant="outline" className="w-full" onClick={() => router.push("/schedule")}>
            View All Streams
          </Button>
          <Button variant="outline" className="w-full" onClick={() => void fetchStreams()} disabled={loading}>
            {loading ? "Refreshing…" : "Manual Refresh"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleFetchIntegrationKey} disabled={integrating}>
            {integrationKey ? "Integration Ready" : "Get Integration"}
          </Button>
        </div>
        {integrationKey && (
          <div className="text-xs text-muted-foreground">
            Demo RTMP Key: <code className="bg-muted px-1 rounded">{integrationKey}</code>
          </div>
        )}
      </CardFooter>
    </Card>
  )

}
