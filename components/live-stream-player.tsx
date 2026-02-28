"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Volume2,
  VolumeX,
  Maximize,
  Pause,
  Play,
  RepeatIcon as Record,
  Clock,
  CheckCircle,
  StopCircle,
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
  const [showRecordingFinishedDialog, setShowRecordingFinishedDialog] = useState(false)
  const [finishedRecordingId, setFinishedRecordingId] = useState<string | null>(null)
  const [targetLatencyBufferMs, setTargetLatencyBufferMs] = useState(2000)
  const [rendition, setRendition] = useState<LiveRendition>("1080p")
  const [isRebuffering, setIsRebuffering] = useState(false)
  const [stallCount, setStallCount] = useState(0)
  const [stallDurationMs, setStallDurationMs] = useState(0)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [sourceStatus, setSourceStatus] = useState<"healthy" | "recovering" | "failed">("healthy")
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [catchUpActive, setCatchUpActive] = useState(false)
  const [liveEdgeSeconds, setLiveEdgeSeconds] = useState(0)
  const [playheadSeconds, setPlayheadSeconds] = useState(0)

  const playerRef = useRef<HTMLDivElement>(null)
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)
  const stallStartedAt = useRef<number | null>(null)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const { addRecording } = useRecordings()

  // Toggle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (value[0] === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!playerRef.current) return

    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Start recording dialog
  const openRecordingDialog = () => {
    if (recordingState !== "inactive") {
      // If already recording, just pause/resume
      toggleRecordingState()
      return
    }

    // Default title based on current date/time
    const now = new Date()
    setRecordingTitle(`Recording - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
    setShowRecordingDialog(true)
  }

  // Start recording
  const startRecording = () => {
    setShowRecordingDialog(false)
    setRecordingState("recording")
    setRecordingTime(0)

    toast({
      title: "Recording started",
      description: `Recording "${recordingTitle}" has started.`,
    })
  }

  // Toggle recording state (pause/resume)
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

  // Stop recording
  const stopRecording = () => {
    if (recordingState === "inactive") return

    // Generate a unique ID for the recording
    const recordingId = `rec-${Date.now()}`
    setFinishedRecordingId(recordingId)

    // Add the recording to the user's recordings
    addRecording({
      id: recordingId,
      title: recordingTitle,
      description: recordingDescription,
      streamId: streamId,
      duration: recordingTime,
      quality: recordingQuality,
      timestamp: new Date().toISOString(),
      thumbnail: "/placeholder.svg?height=720&width=1280",
      size: Math.round(
        (recordingTime / 60) * (recordingQuality === "1080p" ? 100 : recordingQuality === "720p" ? 60 : 30),
      ),
      views: 0,
    })

    // Reset recording state
    setRecordingState("inactive")
    setRecordingTime(0)
    setShowRecordingFinishedDialog(true)
  }

  // Format time (for recording timer and progress bar)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Handle seeking in replay mode
  const handleSeek = (value: number[]) => {
    if (isReplay && onTimeUpdate) {
      setLocalCurrentTime(value[0])
      onTimeUpdate(value[0])
    }
  }

  // Update fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Recording timer
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

  // Update local time for replay mode
  useEffect(() => {
    if (isReplay && isPlaying) {
      const interval = setInterval(() => {
        if (localCurrentTime < localDuration) {
          const newTime = localCurrentTime + 1
          setLocalCurrentTime(newTime)
          if (onTimeUpdate) {
            onTimeUpdate(newTime)
          }
        } else {
          setIsPlaying(false)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isReplay, isPlaying, localCurrentTime, localDuration, onTimeUpdate])

  // Update local values when props change
  useEffect(() => {
    setLocalCurrentTime(currentTime)
    setLocalDuration(duration)
  }, [currentTime, duration])

  // Lightweight adaptive latency buffer for live playback.
  useEffect(() => {
    if (isReplay) return

    const interval = setInterval(() => {
      const congestionScore = Math.random()
      const nextBuffer = congestionScore > 0.75 ? 4000 : congestionScore > 0.45 ? 2600 : 1600
      setTargetLatencyBufferMs(nextBuffer)
    }, 8000)

    return () => clearInterval(interval)
  }, [isReplay])

  // Simulated live-edge tracking + catch-up cadence.
  useEffect(() => {
    if (isReplay || !isPlaying) return

    const interval = setInterval(() => {
      setLiveEdgeSeconds((edge) => edge + 1)
      setPlayheadSeconds((position) => {
        const catchUpStep = catchUpActive ? 1.25 : 1
        return position + catchUpStep
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [catchUpActive, isPlaying, isReplay])

  // Detect rebuffer events and temporarily lower rendition.
  useEffect(() => {
    if (isReplay || !isPlaying || sourceStatus !== "healthy") return

    const maybeRebuffer = setInterval(() => {
      const shouldStall = Math.random() < 0.2
      if (!shouldStall || stallStartedAt.current) return

      stallStartedAt.current = Date.now()
      setIsRebuffering(true)
      setStallCount((prev) => prev + 1)
      setRendition((prev) => {
        const currentIndex = LIVE_RENDITIONS.indexOf(prev)
        const nextIndex = Math.min(currentIndex + 1, LIVE_RENDITIONS.length - 1)
        return LIVE_RENDITIONS[nextIndex]
      })

      toast({
        title: "Network dip detected",
        description: "Lowering stream quality temporarily to reduce buffering.",
      })

      setTimeout(() => {
        if (!stallStartedAt.current) return
        const durationMs = Date.now() - stallStartedAt.current
        setStallDurationMs((prev) => prev + durationMs)
        setIsRebuffering(false)
        stallStartedAt.current = null
      }, 1200)
    }, 9000)

    return () => clearInterval(maybeRebuffer)
  }, [isPlaying, isReplay, sourceStatus, toast])

  // Retry source fetch without hard-reset unless max retries reached.
  useEffect(() => {
    if (isReplay || sourceStatus !== "healthy") return

    const failureProbe = setInterval(() => {
      if (Math.random() < 0.08) {
        setSourceStatus("recovering")
        setRetryAttempt(1)
      }
    }, 15000)

    return () => clearInterval(failureProbe)
  }, [isReplay, sourceStatus])

  useEffect(() => {
    if (sourceStatus !== "recovering") return

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
    }

    const attempt = retryAttempt
    const delayMs = Math.min(5000, 1000 * attempt)

    retryTimerRef.current = setTimeout(() => {
      const recovered = Math.random() > 0.35 || attempt >= 3

      if (recovered) {
        setSourceStatus("healthy")
        setReconnectCount((prev) => prev + 1)
        setRetryAttempt(0)
        setCatchUpActive(true)
        setPlayheadSeconds((_) => Math.max(0, liveEdgeSeconds - targetLatencyBufferMs / 1000))
        setTimeout(() => setCatchUpActive(false), 5000)
        return
      }

      if (attempt >= 4) {
        setSourceStatus("failed")
        return
      }

      setRetryAttempt((prev) => prev + 1)
    }, delayMs)

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [liveEdgeSeconds, retryAttempt, sourceStatus, targetLatencyBufferMs])

  // QoE metric logging for analytics ingestion.
  useEffect(() => {
    if (isReplay) return

    const qoeMetrics = {
      streamId,
      stallCount,
      stallDurationMs,
      reconnectCount,
      rendition,
      targetLatencyBufferMs,
      timestamp: new Date().toISOString(),
    }

    console.info("[qoe] live-stream-player", qoeMetrics)
  }, [isReplay, reconnectCount, rendition, stallCount, stallDurationMs, streamId, targetLatencyBufferMs])

  const retryStreamSource = () => {
    if (sourceStatus === "healthy") return
    setSourceStatus("recovering")
    setRetryAttempt((prev) => Math.max(prev, 1))
  }

  const hardResetPlayer = () => {
    setSourceStatus("healthy")
    setRetryAttempt(0)
    setIsRebuffering(false)
    stallStartedAt.current = null
    setCatchUpActive(false)
    setPlayheadSeconds(Math.max(0, liveEdgeSeconds - targetLatencyBufferMs / 1000))
  }

  return (
    <>
      <div
        ref={playerRef}
        className="relative aspect-video w-full bg-black"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Placeholder - In a real app, this would be a video element */}
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

        {/* Stream Status */}
        <div className="absolute top-4 left-4 flex gap-2">
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
                recordingState === "recording" ? "bg-red-500 animate-pulse" : "bg-amber-500",
              )}
            >
              <Record className="mr-1 h-3 w-3" />
              {recordingState === "recording" ? `REC ${formatTime(recordingTime)}` : "PAUSED"}
            </Badge>
          )}
        </div>

        {/* Controls Overlay - Show on hover or when paused */}
        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Top Controls */}
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
                          className="h-9 w-9 rounded-full text-white hover:bg-white/20 text-red-500"
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

          {/* Bottom Controls */}
          <div className="flex flex-col gap-2">
            {/* Seek bar for replay mode */}
            {isReplay && (
              <div className="flex items-center gap-2 px-2 text-white">
                <span className="text-xs">{formatTime(localCurrentTime)}</span>
                <Slider
                  value={[localCurrentTime]}
                  min={0}
                  max={localDuration}
                  step={1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <span className="text-xs">{formatTime(localDuration)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>

                  <div className="hidden w-24 sm:block">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {isReplay && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-9 rounded-full text-white hover:bg-white/20">
                          <Clock className="mr-1 h-4 w-4" /> 1x
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Playback Speed</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
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

      {/* Recording Setup Dialog */}
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
              <Input
                id="recording-title"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                className="col-span-3"
              />
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
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Recording Finished Dialog */}
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
            <p className="text-sm text-muted-foreground mb-4">{recordingDescription}</p>
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
