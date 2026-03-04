"use client"

import { useState, useRef, useEffect, useCallback, type TouchEvent } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react"
import type { RecordedStream } from "@/types/recording"

interface StreamPlaybackProps {
  stream: RecordedStream | null
  isOpen: boolean
  onClose: () => void
  onDownload: (stream: RecordedStream) => void
  onShare: (stream: RecordedStream) => void
}

const QUALITY_OPTIONS = ["auto", "1080p", "720p", "480p", "360p"]
const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2]

const emitAnalyticsHook = (eventName: string, payload: Record<string, unknown>) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("runash:analytics", { detail: { eventName, payload } }))
}

export default function StreamPlayback({ stream, isOpen, onClose, onDownload, onShare }: StreamPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [quality, setQuality] = useState("auto")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [videoInstanceKey, setVideoInstanceKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | "center" }>({ time: 0, side: "center" })
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (isOpen && stream) {
      setIsPlaying(false)
      setCurrentTime(0)
      setErrorMessage(null)
    }
  }, [isOpen, stream])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video || !stream) return

    if (isPlaying) {
      video.pause()
      emitAnalyticsHook("recording_pause", { streamId: stream.id })
    } else {
      video.play().catch(() => setErrorMessage("Playback failed to start. Please try again."))
      emitAnalyticsHook("recording_play", { streamId: stream.id })
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, stream])

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newTime = value[0]
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const seekBy = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || duration))
    setCurrentTime(video.currentTime)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = value[0]
    video.volume = newVolume
    video.muted = newVolume === 0
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container || !stream) return

    if (!isFullscreen) {
      container.requestFullscreen?.()
      emitAnalyticsHook("recording_fullscreen", { streamId: stream.id, enabled: true })
    } else {
      document.exitFullscreen?.()
      emitAnalyticsHook("recording_fullscreen", { streamId: stream.id, enabled: false })
    }
  }

  const recoverPlayback = () => {
    const video = videoRef.current
    setIsRecovering(true)
    setErrorMessage(null)

    if (video) {
      video.load()
      video.play().then(() => setIsPlaying(true)).catch(() => setErrorMessage("Could not recover playback."))
    } else {
      setVideoInstanceKey((prev) => prev + 1)
    }

    window.setTimeout(() => setIsRecovering(false), 1200)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(video.duration)
    }

    const handleError = () => {
      setIsPlaying(false)
      setErrorMessage("Playback interrupted. Check your network and retry.")
    }

    const handleWaiting = () => {
      setIsRecovering(true)
    }

    const handleCanPlay = () => {
      setIsRecovering(false)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("stalled", handleError)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("stalled", handleError)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
    }
  }, [videoInstanceKey])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const speed = Number(playbackSpeed)
    video.playbackRate = speed
  }, [playbackSpeed])

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
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["Space", "KeyM", "KeyF"].includes(event.code)) return
      event.preventDefault()
      if (event.code === "Space") togglePlay()
      if (event.code === "KeyM") toggleMute()
      if (event.code === "KeyF") toggleFullscreen()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, togglePlay])

  const skipForward = () => seekBy(10)
  const skipBackward = () => seekBy(-10)

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const side = touch.clientX < rect.left + rect.width / 2 ? "left" : "right"
    const now = Date.now()
    if (now - lastTapRef.current.time < 280 && lastTapRef.current.side === side) {
      seekBy(side === "left" ? -10 : 10)
    }
    lastTapRef.current = { time: now, side }

    if (!touchStartRef.current) return
    const deltaY = touchStartRef.current.y - touch.clientY
    if (Math.abs(deltaY) > 24 && side === "right") {
      handleVolumeChange([Math.max(0, Math.min(1, volume + deltaY / 400))])
    }
  }

  if (!stream) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="p-4">
          <DialogTitle>{stream.title}</DialogTitle>
        </DialogHeader>

        <div ref={containerRef} className="relative bg-black" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <video
            key={videoInstanceKey}
            ref={videoRef}
            src={stream.recordingUrl}
            className="aspect-video w-full"
            poster={stream.thumbnailUrl}
            onClick={togglePlay}
          />

          {(errorMessage || isRecovering) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/90 p-5 text-center text-white">
                {errorMessage ? <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-orange-400" /> : <RefreshCcw className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-400" />}
                <p className="text-sm">{errorMessage ?? "Reconnecting playback..."}</p>
                {errorMessage && (
                  <Button variant="secondary" className="mt-3" onClick={recoverPlayback}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white">{formatTime(currentTime)}</span>
                <Slider value={[currentTime]} max={duration || 0} step={0.1} onValueChange={handleSeek} className="flex-1" />
                <span className="text-sm text-white">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={skipBackward} className="text-white">
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white">
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={skipForward} className="text-white">
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="ml-2 flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white">
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
                  </div>

                  <Select value={quality} onValueChange={(value) => {
                    setQuality(value)
                    emitAnalyticsHook("recording_quality_change", { streamId: stream.id, quality: value })
                  }}>
                    <SelectTrigger className="h-8 w-[90px] border-white/30 bg-black/30 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                    <SelectTrigger className="h-8 w-[80px] border-white/30 bg-black/30 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <SelectItem key={speed} value={String(speed)}>{speed}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onDownload(stream)} className="text-white" title="Download">
                    <Download className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onShare(stream)} className="text-white" title="Share">
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white" title="Fullscreen">
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
