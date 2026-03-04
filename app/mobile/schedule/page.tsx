"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, CalendarIcon, Clock, RefreshCcw, Trash2, Pencil } from "lucide-react"
import MobileLayout from "@/components/mobile/layout"
import type {
  MobileCreateScheduleResponse,
  MobileScheduleListResponse,
  MobileScheduleMutationResponse,
  ScheduledStream,
} from "@/types/mobile-app"

export default function MobileSchedulePage() {
  const [streams, setStreams] = useState<ScheduledStream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [activeTab, setActiveTab] = useState("upcoming")
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date(0).toISOString())
  const [pendingChanges, setPendingChanges] = useState(0)

  const fetchSchedule = async () => {
    const response = await fetch("/api/mobile/schedule")
    const body = (await response.json()) as { data?: MobileScheduleListResponse }
    if (!response.ok || !body.data) return

    setStreams(body.data.streams)
    setLastSyncedAt(body.data.sync.lastSyncedAt)
  }

  useEffect(() => {
    const load = async () => {
      try {
        await fetchSchedule()
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

  const upcomingStreams = useMemo(() => streams.filter((stream) => new Date(stream.scheduledDate) > new Date()), [streams])

  const selectedDateStreams = useMemo(() => {
    if (!selectedDate) return []

    return streams.filter((stream) => {
      const streamDate = new Date(stream.scheduledDate)
      return (
        streamDate.getDate() === selectedDate.getDate() &&
        streamDate.getMonth() === selectedDate.getMonth() &&
        streamDate.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [selectedDate, streams])

  const createStream = async () => {
    const now = new Date()
    now.setDate(now.getDate() + 1)

    setPendingChanges((value) => value + 1)
    try {
      const response = await fetch("/api/mobile/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `New Stream ${streams.length + 1}`,
          description: "Created from mobile schedule",
          scheduledDate: now.toISOString(),
          duration: 60,
          platforms: ["twitch-1"],
          tags: ["mobile"],
          category: "Just Chatting",
          notificationTime: 15,
        }),
      })

      const body = (await response.json()) as { data?: MobileCreateScheduleResponse }
      if (!response.ok || !body.data) return

      setStreams((previous) => [...previous, body.data!.stream].sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate)))
      setLastSyncedAt(body.data.sync.lastSyncedAt)
    } finally {
      setPendingChanges((value) => Math.max(0, value - 1))
    }
  }

  const updateStream = async (stream: ScheduledStream) => {
    setPendingChanges((value) => value + 1)
    try {
      const response = await fetch(`/api/mobile/schedule/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${stream.title} (Updated)`,
          expectedVersion: stream.version,
        }),
      })

      const body = (await response.json()) as { data?: MobileScheduleMutationResponse }
      if (!body.data) return

      if (response.status === 409 && body.data.stream) {
        setStreams((previous) => previous.map((item) => (item.id === stream.id ? body.data!.stream! : item)))
        return
      }

      if (!response.ok || !body.data.stream) return

      setStreams((previous) => previous.map((item) => (item.id === stream.id ? body.data!.stream! : item)))
      setLastSyncedAt(body.data.sync.lastSyncedAt)
    } finally {
      setPendingChanges((value) => Math.max(0, value - 1))
    }
  }

  const deleteStream = async (stream: ScheduledStream) => {
    setPendingChanges((value) => value + 1)
    try {
      const response = await fetch(`/api/mobile/schedule/${stream.id}?expectedVersion=${stream.version ?? ""}`, {
        method: "DELETE",
      })

      if (response.status === 409) {
        await fetchSchedule()
        return
      }

      if (!response.ok) return
      setStreams((previous) => previous.filter((item) => item.id !== stream.id))
      setLastSyncedAt(new Date().toISOString())
    } finally {
      setPendingChanges((value) => Math.max(0, value - 1))
    }
  }

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading schedule...</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center gap-2">
          <h2 className="text-lg font-bold">Stream Schedule</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void fetchSchedule()}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90" onClick={() => void createStream()}>
              <Plus className="h-4 w-4 mr-2" /> New Stream
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">Last synced: {new Date(lastSyncedAt).toLocaleString()} · Pending changes: {pendingChanges}</div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {upcomingStreams.length > 0 ? (
              <div className="space-y-3">
                {upcomingStreams.map((stream) => (
                  <Card key={stream.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-medium">{stream.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <CalendarIcon className="h-3 w-3 mr-1" /> {formatDate(stream.scheduledDate)}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3 mr-1" /> {formatTime(stream.scheduledDate)} ({stream.duration} min)
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {stream.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs">{platform.split("-")[0]}</Badge>
                            ))}
                            {stream.isRecurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => void updateStream(stream)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => void deleteStream(stream)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium mb-1">No upcoming streams</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule a new stream to see it here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="mx-auto" />
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="font-medium">{selectedDate ? selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "Select a date"}</h3>

              {selectedDateStreams.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateStreams.map((stream) => (
                    <Card key={stream.id}>
                      <CardContent className="p-3">
                        <h3 className="font-medium">{stream.title}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{formatTime(stream.scheduledDate)} ({stream.duration} min)</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No streams scheduled for this date</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  )
}
