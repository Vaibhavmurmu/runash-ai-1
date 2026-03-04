"use client"

import { useState, useRef, useEffect, useCallback, type TouchEvent } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Pause,
  Play,
  RepeatIcon as Record,
  Clock,
  CheckCircle,
  StopCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
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
import { useRecordings } from "@/hooks/use-recordings"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const LIVE_RENDITIONS = ["1080p", "720p", "480p", "360p"] as const
type LiveRendition = (typeof LIVE_RENDITIONS)[number]

interface LiveStreamPlayerProps {
  streamId: string
  isRecording?: boolean
  isReplay?: boolean
  duration?: number
  currentTime?: number
  onTimeUpdate?: (time: number) => void
}

const QUALITY_OPTIONS = ["auto", "1080p", "720p", "480p", "360p"]
const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2]

const emitAnalyticsHook = (eventName: string, payload: Record<string, unknown>) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("runash:analytics", { detail: { eventName, payload } }))
}

export default function LiveStreamPlayer({
  streamId,
  isRecording = false,
  isReplay = false,
  duration = 0,
  currentTime = 0,
  onTimeUpdate,
}: LiveStreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [brightness, setBrightness] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [recordingState, setRecordingState] = useState<"inactive" | "recording" | "paused">(
    isRecording ? "recording" : "inactive",
  )
  const [recordingTime, setRecordingTime] = useState(0)
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime)
  const [localDuration, setLocalDuration] = useState(duration)
  const [showRecordingDialog, setShowRecordingDialog] = useState(false)
  const [recordingTitle, setRecordingTitle] = useState("")
  const [recordingDescription, setRecordingDescription] = useState("")
  const [recordingQuality, setRecordingQuality] = useState("720p")
  const [playbackQuality, setPlaybackQuality] = useState("auto")
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [showRecordingFinishedDialog, setShowRecordingFinishedDialog] = useState(false)
  const [finishedRecordingId, setFinishedRecordingId] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(true)
  const [reconnectState, setReconnectState] = useState<"idle" | "reconnecting" | "failed">("idle")

  const playerRef = useRef<HTMLDivElement>(null)
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | "center" }>({ time: 0, side: "center" })
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const { toast } = useToast()
  const { addRecording } = useRecordings()

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev
      emitAnalyticsHook(next ? "live_stream_play" : "live_stream_pause", { streamId, mode: isReplay ? "replay" : "live" })
      return next
    })
  }, [isReplay, streamId])

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const handleVolumeChange = (value: number[]) => {
    const nextVolume = value[0]
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
  }

  const toggleFullscreen = () => {
    if (!playerRef.current) return

    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(() => null)
      emitAnalyticsHook("live_stream_fullscreen", { streamId, enabled: true })
    } else {
      document.exitFullscreen()
      emitAnalyticsHook("live_stream_fullscreen", { streamId, enabled: false })
    }
  }

  const openRecordingDialog = () => {
    if (recordingState !== "inactive") {
      toggleRecordingState()
      return
    }

    const now = new Date()
    setRecordingTitle(`Recording - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
    setShowRecordingDialog(true)
  }

  const startRecording = () => {
    setShowRecordingDialog(false)
    setRecordingState("recording")
    setRecordingTime(0)

    toast({
      title: "Recording started",
      description: `Recording "${recordingTitle}" has started.`,
    })
  }

  const toggleRecordingState = () => {
    if (recordingState === "recording") {
      setRecordingState("paused")
      toast({
        title: "Recording paused",
        description: "Your recording has been paused. Press record again to resume.",
      })
    } else if (recordingState === "paused") {
      setRecordingState("recording")
      toast({
        title: "Recording resumed",
        description: "Your recording has been resumed.",
      })
    }
  }

  const stopRecording = () => {
    if (recordingState === "inactive") return

    const recordingId = `rec-${Date.now()}`
    setFinishedRecordingId(recordingId)

    addRecording({
      id: recordingId,
      title: recordingTitle,
      description: recordingDescription,
      streamId,
      duration: recordingTime,
      quality: recordingQuality,
      timestamp: new Date().toISOString(),
      thumbnail: "/placeholder.svg?height=720&width=1280",
      size: Math.round((recordingTime / 60) * (recordingQuality === "1080p" ? 100 : recordingQuality === "720p" ? 60 : 30)),
      views: 0,
    })

    setRecordingState("inactive")
    setRecordingTime(0)
    setShowRecordingFinishedDialog(true)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleSeek = (value: number[]) => {
    if (!isReplay || !onTimeUpdate) return
    setLocalCurrentTime(value[0])
    onTimeUpdate(value[0])
  }

  const seekBy = (seconds: number) => {
    if (!isReplay || !onTimeUpdate) return
    const next = Math.max(0, Math.min(localDuration, localCurrentTime + seconds))
    setLocalCurrentTime(next)
    onTimeUpdate(next)
  }

  const recoverConnection = () => {
    setReconnectState("reconnecting")
    setIsBuffering(true)
    window.setTimeout(() => {
      setReconnectState("idle")
      setIsBuffering(false)
      toast({ title: "Reconnected", description: "Live stream playback is back online." })
    }, 1500)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (recordingState === "recording") {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else if (recordingInterval.current) {
      clearInterval(recordingInterval.current)
    }

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current)
      }
    }
  }, [recordingState])

  useEffect(() => {
    if (isReplay && isPlaying) {
      const interval = setInterval(() => {
        setLocalCurrentTime((prev) => {
          const next = Math.min(localDuration, prev + Number(playbackSpeed))
          onTimeUpdate?.(next)
          if (next >= localDuration) {
            setIsPlaying(false)
          }
          return next
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isReplay, isPlaying, localDuration, onTimeUpdate, playbackSpeed])

  useEffect(() => {
    setLocalCurrentTime(currentTime)
    setLocalDuration(duration)
  }, [currentTime, duration])

  useEffect(() => {
    setIsBuffering(true)
    const timer = setTimeout(() => setIsBuffering(false), 1200)
    return () => clearTimeout(timer)
  }, [streamId, isReplay])

  useEffect(() => {
    const failureTimer = setTimeout(() => {
      if (!isReplay && isPlaying) {
        setReconnectState("failed")
      }
    }, 25000)

    return () => clearTimeout(failureTimer)
  }, [isReplay, isPlaying])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (!["Space", "KeyM", "KeyF"].includes(event.code)) return

      event.preventDefault()
      if (event.code === "Space") togglePlay()
      if (event.code === "KeyM") toggleMute()
      if (event.code === "KeyF") toggleFullscreen()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [togglePlay])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    const rect = playerRef.current?.getBoundingClientRect()
    if (!rect) return

    const side = touch.clientX < rect.left + rect.width / 2 ? "left" : "right"
    const now = Date.now()
    if (now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      seekBy(side === "left" ? -10 : 10)
      toast({ title: `Skipped ${side === "left" ? "back" : "forward"}`, description: "10 seconds" })
    }
    lastTapRef.current = { time: now, side }

    if (!touchStartRef.current) return
    const deltaY = touchStartRef.current.y - touch.clientY
    if (Math.abs(deltaY) > 24) {
      if (side === "right") {
        handleVolumeChange([Math.max(0, Math.min(100, volume + deltaY / 3))])
      } else {
        setBrightness((prev) => Math.max(40, Math.min(130, prev + deltaY / 4)))
      }
    }
  }

  return (
    <>
      <div
        ref={playerRef}
        className="relative aspect-video w-full bg-black"
        style={{ filter: `brightness(${brightness}%)` }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {(isBuffering || reconnectState === "reconnecting") && (
          <div className="absolute inset-0 z-20 bg-black/80 p-4">
            <div className="mx-auto mt-8 w-full max-w-2xl space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        )}

        {reconnectState === "failed" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
            <div className="rounded-lg border border-red-500/40 bg-zinc-900/80 p-6 text-center text-white">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
              <p className="font-semibold">Live playback disconnected</p>
              <p className="mb-4 text-sm text-zinc-300">We lost the stream signal. Try reconnecting.</p>
              <Button onClick={recoverConnection} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reconnect
              </Button>
            </div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          {isPlaying ? (
            <div className="h-24 w-24 rounded-full bg-orange-500/20 p-6 backdrop-blur-sm">
              <div className="h-full w-full rounded-full bg-orange-500/40 p-4">
                <div className="h-full w-full rounded-full bg-orange-500"></div>
              </div>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-24 w-24 rounded-full bg-orange-500/20 text-white backdrop-blur-sm hover:bg-orange-500/30"
              onClick={togglePlay}
            >
              <Play className="h-12 w-12" />
            </Button>
          )}
        </div>

        <div className="absolute left-4 top-4 flex gap-2">
          {!isReplay && <Badge className="bg-red-500 hover:bg-red-600">LIVE</Badge>}
          {isReplay && <Badge className="bg-zinc-700 hover:bg-zinc-600">REPLAY</Badge>}
          <Badge className="bg-zinc-800/80 backdrop-blur-sm">
            <Users className="mr-1 h-3 w-3" /> {isReplay ? "2.5K views" : "1.2K watching"}
          </Badge>
          {!isReplay && <Badge className="bg-zinc-800/80">Latency {Math.round(targetLatencyBufferMs / 1000)}s</Badge>}
          {!isReplay && <Badge className="bg-zinc-800/80">{rendition}</Badge>}
          {!isReplay && isRebuffering && <Badge className="bg-amber-500">Rebuffering…</Badge>}
          {!isReplay && catchUpActive && <Badge className="bg-blue-500">Catching up</Badge>}
          {!isReplay && sourceStatus !== "healthy" && (
            <Badge className={cn(sourceStatus === "failed" ? "bg-red-500" : "bg-amber-500")}>{sourceStatus}</Badge>
          )}
          {recordingState !== "inactive" && (
            <Badge
              className={cn(
                "flex items-center gap-1 backdrop-blur-sm",
                recordingState === "recording" ? "animate-pulse bg-red-500" : "bg-amber-500",
              )}
            >
              <Record className="mr-1 h-3 w-3" />
              {recordingState === "recording" ? `REC ${formatTime(recordingTime)}` : "PAUSED"}
            </Badge>
          )}
        </div>

        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex justify-end">
            {!isReplay && (
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-9 w-9 rounded-full text-white hover:bg-white/20",
                          recordingState !== "inactive" && "text-red-500",
                        )}
                        onClick={openRecordingDialog}
                      >
                        <Record className={cn("h-5 w-5", recordingState === "recording" && "animate-pulse")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {recordingState === "inactive"
                        ? "Start Recording"
                        : recordingState === "recording"
                          ? "Pause Recording"
                          : "Resume Recording"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {recordingState !== "inactive" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-full text-red-500 hover:bg-white/20"
                          onClick={stopRecording}
                        >
                          <StopCircle className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Stop Recording</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isReplay && (
              <div className="flex items-center gap-2 px-2 text-white">
                <span className="text-xs">{formatTime(localCurrentTime)}</span>
                <Slider value={[localCurrentTime]} min={0} max={localDuration} step={1} onValueChange={handleSeek} className="cursor-pointer" />
                <span className="text-xs">{formatTime(localDuration)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/20" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/20" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>

                  <div className="hidden w-24 sm:block">
                    <Slider value={[isMuted ? 0 : volume]} min={0} max={100} step={1} onValueChange={handleVolumeChange} className="cursor-pointer" />
                  </div>
                </div>

                <Select
                  value={playbackQuality}
                  onValueChange={(value) => {
                    setPlaybackQuality(value)
                    emitAnalyticsHook("live_stream_quality_change", { streamId, quality: value, mode: isReplay ? "replay" : "live" })
                  }}
                >
                  <SelectTrigger className="h-9 w-[92px] border-white/20 bg-black/30 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isReplay && (
                  <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                    <SelectTrigger className="h-9 w-[84px] border-white/20 bg-black/30 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <SelectItem key={speed} value={String(speed)}>
                          {speed}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {isReplay && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-9 rounded-full text-white hover:bg-white/20">
                          <Clock className="mr-1 h-4 w-4" /> {playbackSpeed}x
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Playback Speed</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/20" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>

            {!isReplay && sourceStatus !== "healthy" && (
              <div className="flex items-center justify-between rounded-md bg-black/50 px-3 py-2 text-xs text-white">
                <span>Source {sourceStatus}. Retry attempt {retryAttempt || 1}.</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={retryStreamSource}>
                    Retry source
                  </Button>
                  {sourceStatus === "failed" && (
                    <Button size="sm" variant="destructive" onClick={hardResetPlayer}>
                      Hard reset
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!isReplay && (
              <div className="rounded-md bg-black/50 px-3 py-2 text-xs text-white/90">
                QoE: stalls {stallCount} · stall duration {Math.round(stallDurationMs / 1000)}s · reconnects {reconnectCount}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showRecordingDialog} onOpenChange={setShowRecordingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start Recording</DialogTitle>
            <DialogDescription>Configure your recording settings. You can edit these details later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recording-title" className="text-right">
                Title
              </Label>
              <Input id="recording-title" value={recordingTitle} onChange={(e) => setRecordingTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recording-description" className="text-right">
                Description
              </Label>
              <Input
                id="recording-description"
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recording-quality" className="text-right">
                Quality
              </Label>
              <select
                id="recording-quality"
                value={recordingQuality}
                onChange={(e) => setRecordingQuality(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1080p">High Quality (1080p)</option>
                <option value="720p">Standard Quality (720p)</option>
                <option value="480p">Low Quality (480p)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startRecording}>Start Recording</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecordingFinishedDialog} onOpenChange={setShowRecordingFinishedDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recording Complete
            </DialogTitle>
            <DialogDescription>Your recording has been saved successfully.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2 font-medium">{recordingTitle}</p>
            <p className="mb-4 text-sm text-muted-foreground">{recordingDescription}</p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Duration: {formatTime(recordingTime)}</span>
              <span>Quality: {recordingQuality}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordingFinishedDialog(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={`/recordings/${finishedRecordingId}`}>View Recording</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
