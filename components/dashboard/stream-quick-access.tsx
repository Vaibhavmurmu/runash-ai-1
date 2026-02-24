"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Video, Calendar, Clock, Users, Settings, Mail, Link as LinkIcon, RotateCcw, Sparkles, BarChart3, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { RecordingService } from "@/lib/recording-service"
import { dashboardStreamingService } from "@/lib/streaming-service"
import type { DashboardRecentStream, DashboardScheduledStream } from "@/lib/types/dashboard-streams"
import { useStreamingStudioRealtime } from "@/lib/hooks/use-streaming-studio-realtime"

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

export function StreamQuickAccess() {
  const router = useRouter()
  const [streamTitle, setStreamTitle] = useState("")
  const [streamCategory, setStreamCategory] = useState("gaming")
  const [recentStreams, setRecentStreams] = useState<DashboardRecentStream[]>([])
  const [scheduledStreams, setScheduledStreams] = useState<DashboardScheduledStream[]>([])
  const [loading, setLoading] = useState(false)

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

  const initialStreamIds = useMemo(() => recentStreams.map((stream) => stream.id), [recentStreams])
  const { connected, streams: streamRealtime, alerts, subscribe } = useStreamingStudioRealtime({ initialStreamIds })

  useEffect(() => {
    initialStreamIds.forEach((streamId) => subscribe(streamId))
  }, [initialStreamIds, subscribe])

  const effectiveRecentStreams = useMemo(
    () =>
      recentStreams.map((stream) => {
        const realtime = streamRealtime[stream.id]
        return {
          ...stream,
          status: (realtime?.status as DashboardRecentStream["status"] | undefined) ?? stream.status,
          viewers: realtime?.concurrentViewers ?? stream.viewers,
        }
      }),
    [recentStreams, streamRealtime],
  )

  useEffect(() => {
    async function fetchStreams() {
      setLoading(true)
      try {
        const [recentJson, scheduledJson] = await Promise.all([
          dashboardStreamingService.fetchRecentStreams(),
          dashboardStreamingService.fetchScheduledStreams(),
        ])

        setRecentStreams(Array.isArray(recentJson.streams) ? recentJson.streams : [])
        setScheduledStreams(Array.isArray(scheduledJson.streams) ? scheduledJson.streams : [])

        try {
          const recordings = await RecordingService.getInstance().getUserRecordings()
          const latestRecording = recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          setRecentRecordingEditHref(latestRecording?.id ? `/recordings?recordingId=${encodeURIComponent(latestRecording.id)}&mode=edit` : "/recordings")
        } catch {
          setRecentRecordingEditHref("/recordings")
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not load streams."
        toast({ title: "Error", description: message })
      } finally {
        setLoading(false)
      }
    }

    fetchStreams()
  }, [])

  const handleStartStream = async () => {
    if (!streamTitle) {
      toast({ title: "Missing Title", description: "Please enter a stream title." })
      return
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not start stream."
      toast({ title: "Error", description: message })
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
      toast({ title: "Integration Ready", description: "Received RTMP key (demo)." })
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
      const targetId = await dashboardStreamingService.openPreviousLiveSessionContext()

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
    if (!lastLiveStream?.id) {
      toast({ title: "Highlights unavailable", description: "No completed live stream found." })
      return
    }

    try {
      const recordings = await RecordingService.getInstance().getUserRecordings(lastLiveStream.id)
      const linkedRecording = recordings.find((recording) => recording.streamId === lastLiveStream.id) ?? recordings[0]

      if (!linkedRecording?.id) {
        toast({ title: "Highlights unavailable", description: "No recording found for your latest stream." })
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
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last live summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground line-clamp-1">{lastLiveStream?.title ?? "No live session yet"}</p>
              <p>Viewers: {lastLiveStream?.viewers?.toLocaleString?.() ?? 0}</p>
              <p>Duration: {lastLiveStream?.duration ?? "—"}</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resume configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleOpenPreviousLiveSessionContext}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resume setup
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push(recentRecordingEditHref)}>
                Open recent recording edit
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Create highlights from last stream</CardTitle>
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
            </CardContent>
          </Card>
        </div>
        {/* Start Live Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500" disabled={loading}>
              <Video className="mr-2 h-4 w-4" />
              Go Live
            </Button>
          </DialogTrigger>
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
              <Button variant="outline">Cancel</Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                onClick={handleStartStream}
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
            {recentStreams.length === 0 && !loading ? (
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
            {scheduledStreams.length === 0 && !loading ? (
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
