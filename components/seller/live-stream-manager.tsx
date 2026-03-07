"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import useSWR from "swr"
import { useToast } from "@/hooks/use-toast"
import { createLiveStreamSessionV1 } from "@/lib/api/v1-client"
import {
  Video,
  Plus,
  CalendarIcon,
  Clock,
  Users,
  Eye,
  DollarSign,
  Edit,
  Play,
  Square,
  Settings,
  Share2,
} from "lucide-react"

type ApiStream = {
  id: string
  title?: string
  description?: string
  status?: string
  scheduled_for?: string
  created_at?: string
  started_at?: string
  startTime?: string
  viewer_count?: number
  viewers?: number
  revenue?: number
}

type UiStream = {
  id: string
  title: string
  description: string
  status: string
  startTime: string
  viewers: number
  revenue: number
}

type StreamsEnvelope = {
  data?: {
    streams?: ApiStream[]
  }
}

const adaptStreamForUi = (stream: ApiStream): UiStream => {
  const normalizedStartTime =
    stream.startTime ?? stream.scheduled_for ?? stream.started_at ?? stream.created_at ?? new Date().toISOString()

  return {
    id: stream.id,
    title: stream.title ?? "Untitled stream",
    description: stream.description ?? "",
    status: stream.status ?? "scheduled",
    startTime: normalizedStartTime,
    viewers: stream.viewers ?? stream.viewer_count ?? 0,
    revenue: stream.revenue ?? 0,
  }
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load streams")
    return r.json().then((envelope: StreamsEnvelope) => (envelope.data?.streams ?? []).map(adaptStreamForUi))
  })

export function LiveStreamManager() {
  const { toast } = useToast()

  const [streams, setStreams] = useState<UiStream[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string | undefined>()
  const [time, setTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: fetchedStreams, error, isLoading, mutate } = useSWR("/api/streams", fetcher)

  useEffect(() => {
    if (fetchedStreams) setStreams(fetchedStreams)
  }, [fetchedStreams])

  async function handleSchedule() {
    try {
      if (!title.trim() || !selectedDate || !time) {
        toast({ title: "Missing details", description: "Please add a title, date, and time.", variant: "destructive" })
        return
      }
      setIsSubmitting(true)
      await createLiveStreamSessionV1({
        title,
        workspaceId: category || "general",
      })
      await mutate()
      setIsCreateDialogOpen(false)
      setTitle("")
      setDescription("")
      setCategory(undefined)
      setSelectedDate(undefined)
      setTime("")
      toast({ title: "Stream scheduled", description: "Your stream was scheduled successfully." })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not schedule stream.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500"
      case "scheduled":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "live":
        return "Live"
      case "scheduled":
        return "Scheduled"
      case "completed":
        return "Completed"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-6">
      {isLoading && <div className="text-sm text-muted-foreground">Loading streams…</div>}
      {error && <div className="text-sm text-red-600">Failed to load streams. Please refresh or try again later.</div>}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Stream Manager</h2>
          <p className="text-muted-foreground">Manage your live streams and scheduled broadcasts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Stream</DialogTitle>
              <DialogDescription>Create a new live stream session for your organic products</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Stream Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter stream title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="fruits">Fruits</SelectItem>
                      <SelectItem value="herbs">Herbs & Spices</SelectItem>
                      <SelectItem value="dairy">Dairy Products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your stream content"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-amber-500"
                  onClick={handleSchedule}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Stream"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Streams</TabsTrigger>
          <TabsTrigger value="live">Live Now</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {streams.map((stream) => (
              <Card key={stream.id} className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                        <Video className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{stream.title}</h3>
                          <Badge className={`${getStatusColor(stream.status)} text-white`}>
                            {getStatusText(stream.status)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{stream.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(new Date(stream.startTime), "MMM dd, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(stream.startTime), "HH:mm")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {stream.viewers} viewers
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />${stream.revenue}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stream.status === "live" && (
                        <Button size="sm" variant="destructive">
                          <Square className="h-4 w-4 mr-2" />
                          End Stream
                        </Button>
                      )}
                      {stream.status === "scheduled" && (
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500">
                          <Play className="h-4 w-4 mr-2" />
                          Start Stream
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="live">
          <div className="grid gap-4">
            {streams
              .filter((s) => s.status === "live")
              .map((stream) => (
                <Card
                  key={stream.id}
                  className="border-0 shadow-lg bg-white/80 backdrop-blur border-l-4 border-l-red-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center animate-pulse">
                          <Video className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{stream.title}</h3>
                            <Badge className="bg-red-500 text-white animate-pulse">🔴 LIVE</Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{stream.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-red-600 font-medium">
                              <Users className="h-4 w-4" />
                              {stream.viewers} watching now
                            </div>
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="h-4 w-4" />${stream.revenue} earned
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        End Stream
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="grid gap-4">
            {streams
              .filter((s) => s.status === "scheduled")
              .map((stream) => (
                <Card
                  key={stream.id}
                  className="border-0 shadow-lg bg-white/80 backdrop-blur border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                          <CalendarIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{stream.title}</h3>
                            <Badge className="bg-blue-500 text-white">Scheduled</Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{stream.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(stream.startTime), "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(stream.startTime), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500">
                          <Play className="h-4 w-4 mr-2" />
                          Start Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-4">
            {streams
              .filter((s) => s.status === "completed")
              .map((stream) => (
                <Card
                  key={stream.id}
                  className="border-0 shadow-lg bg-white/80 backdrop-blur border-l-4 border-l-green-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{stream.title}</h3>
                            <Badge className="bg-green-500 text-white">Completed</Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{stream.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(stream.startTime), "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {stream.duration}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {stream.viewers} viewers
                            </div>
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="h-4 w-4" />${stream.revenue}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Recording
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
