"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adaptDashboardStreams, type StreamSession } from "@/lib/streams/dashboard-data-adapter"
import {
  createLiveStream,
  deleteScheduledStream,
  listDashboardStreams,
  scheduleStream,
  type DashboardStreamPayload,
  updateScheduledStream,
} from "@/lib/streams/dashboard-client"

type DashboardUiStatus = "loading" | "ready" | "empty" | "error"

export function resolveDashboardUiStatus(args: { loading: boolean; error: string | null; itemCount: number }): DashboardUiStatus {
  if (args.loading) return "loading"
  if (args.error) return "error"
  if (args.itemCount === 0) return "empty"
  return "ready"
}

export function StreamsDashboard() {
  const [liveTitle, setLiveTitle] = useState("")
  const [scheduleTitle, setScheduleTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<DashboardStreamPayload>({ recent: [], scheduled: [] })

  const loadStreams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextPayload = await listDashboardStreams()
      setPayload(nextPayload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stream dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStreams()
  }, [loadStreams])

  const buckets = useMemo(() => adaptDashboardStreams(payload), [payload])
  const uiStatus = resolveDashboardUiStatus({
    loading,
    error,
    itemCount: buckets.liveSessions.length + buckets.scheduledStreams.length + buckets.endedStreams.length,
  })

  const mutateAndRefresh = useCallback(async (request: () => Promise<Response>) => {
    const response = await request()
    if (!response.ok) {
      throw new Error("Request failed")
    }
    await loadStreams()
  }, [loadStreams])

  const handleCreateLive = async () => {
    if (!liveTitle.trim()) return
    await mutateAndRefresh(() => createLiveStream(liveTitle.trim()))
    setLiveTitle("")
  }

  const handleSchedule = async () => {
    if (!scheduleTitle.trim()) return
    await mutateAndRefresh(() => scheduleStream(scheduleTitle.trim(), new Date(Date.now() + 3600000).toISOString()))
    setScheduleTitle("")
  }

  const handleStartScheduled = async (stream: StreamSession) => {
    await mutateAndRefresh(() => updateScheduledStream(stream.id, { status: "live", startsAt: new Date().toISOString() }))
  }

  const handleUpdateScheduled = async (stream: StreamSession) => {
    await mutateAndRefresh(() => updateScheduledStream(stream.id, { title: `${stream.title} (Updated)` }))
  }

  const handleDeleteScheduled = async (stream: StreamSession) => {
    await mutateAndRefresh(() => deleteScheduledStream(stream.id))
  }

  if (uiStatus === "loading") return <p data-testid="streams-dashboard-loading">Loading stream dashboard…</p>
  if (uiStatus === "error") return <p data-testid="streams-dashboard-error">{error}</p>
  if (uiStatus === "empty") return <p data-testid="streams-dashboard-empty">No streams yet. Create or schedule your first stream.</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stream actions</CardTitle>
          <CardDescription>Actions persist server-side and refetch stream state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={liveTitle} onChange={(event) => setLiveTitle(event.target.value)} placeholder="Live stream title" />
            <Button onClick={() => void handleCreateLive()}>Create live</Button>
          </div>
          <div className="flex gap-2">
            <Input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} placeholder="Scheduled stream title" />
            <Button variant="outline" onClick={() => void handleSchedule()}>Schedule</Button>
          </div>
        </CardContent>
      </Card>

      <StreamSection title="Live sessions" streams={buckets.liveSessions} />
      <StreamSection
        title="Scheduled streams"
        streams={buckets.scheduledStreams}
        actions={(stream) => (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleStartScheduled(stream)}>Start</Button>
            <Button size="sm" variant="outline" onClick={() => void handleUpdateScheduled(stream)}>Update</Button>
            <Button size="sm" variant="destructive" onClick={() => void handleDeleteScheduled(stream)}>Delete</Button>
          </div>
        )}
      />
      <StreamSection title="History" streams={buckets.endedStreams} />
    </div>
  )
}

function StreamSection({ title, streams, actions }: { title: string; streams: StreamSession[]; actions?: (stream: StreamSession) => ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {streams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries</p>
        ) : (
          streams.map((stream) => (
            <div key={stream.id} className="flex items-center justify-between border rounded-md p-2">
              <div>
                <p className="font-medium">{stream.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(stream.startsAt).toLocaleString()}</p>
              </div>
              {actions ? actions(stream) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
