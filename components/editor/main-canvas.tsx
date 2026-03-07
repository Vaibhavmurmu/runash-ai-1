"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader, Settings2, Upload, Video, PlusSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import MediaControls from "./media-controls"
import type { EditorRenderJob, EditorTimeline } from "@/lib/editor/domain"

interface MainCanvasProps {
  selectedModel: string
  isRecording: boolean
  timeline?: EditorTimeline
  onTimelineChange?: (timeline: EditorTimeline) => void
  onUploadMedia?: (file: File) => Promise<void>
  uploadInProgress?: boolean
  isPlaying?: boolean
  currentTime?: number
  onCurrentTimeChange?: (time: number) => void
  onPlayPause?: () => void
  onSkipPrevious?: () => void
  onSkipNext?: () => void
  onGenerateVideo?: () => Promise<void>
  isGeneratingRender?: boolean
  generationJob?: EditorRenderJob | null
  generationStatus?: EditorRenderJob["status"] | null
  generationProgress?: number | null
  generationStage?: string | null
}

export default function MainCanvas({
  selectedModel,
  isRecording,
  timeline,
  onTimelineChange,
  onUploadMedia,
  uploadInProgress = false,
  isPlaying: controlledIsPlaying,
  currentTime: controlledCurrentTime,
  onCurrentTimeChange,
  onPlayPause,
  onSkipPrevious,
  onSkipNext,
  onGenerateVideo,
  isGeneratingRender = false,
  generationJob,
  generationStatus,
  generationProgress,
  generationStage,
}: MainCanvasProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false)
  const [internalCurrentTime, setInternalCurrentTime] = useState(0)
  const [duration, setDuration] = useState(timeline?.durationSeconds ?? 10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [localGenerationProgress, setLocalGenerationProgress] = useState(0)
  const [volume, setVolume] = useState(80)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const currentTimeRef = useRef(0)
  const hasStoppedAtEndRef = useRef(false)
  const isPlaying = controlledIsPlaying ?? internalIsPlaying
  const currentTime = controlledCurrentTime ?? internalCurrentTime

  useEffect(() => {
    currentTimeRef.current = currentTime
    if (currentTime < duration) {
      hasStoppedAtEndRef.current = false
    }
  }, [currentTime, duration])

  const setCurrentTime = (value: number) => {
    const next = Math.max(0, Math.min(value, duration))
    if (onCurrentTimeChange) {
      onCurrentTimeChange(next)
      return
    }
    setInternalCurrentTime(next)
  }

  const togglePlay = () => {
    if (onPlayPause) {
      onPlayPause()
      return
    }
    setInternalIsPlaying((prev) => !prev)
  }


  useEffect(() => {
    setDuration(timeline?.durationSeconds ?? 10)
  }, [timeline?.durationSeconds])

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = null
      lastFrameTimeRef.current = null
      hasStoppedAtEndRef.current = false
      return
    }

    const stopPlaybackAtEnd = () => {
      if (hasStoppedAtEndRef.current) return
      hasStoppedAtEndRef.current = true
      if (onPlayPause) {
        onPlayPause()
        return
      }
      setInternalIsPlaying(false)
    }

    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp
      }

      const deltaSeconds = (timestamp - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = timestamp

      const nextTime = Math.min(currentTimeRef.current + deltaSeconds, duration)
      currentTimeRef.current = nextTime
      setCurrentTime(nextTime)

      if (nextTime >= duration) {
        stopPlaybackAtEnd()
        animationFrameRef.current = null
        lastFrameTimeRef.current = null
        return
      }

      animationFrameRef.current = requestAnimationFrame(tick)
    }

    if (currentTimeRef.current >= duration) {
      setCurrentTime(duration)
      stopPlaybackAtEnd()
      return
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = null
      lastFrameTimeRef.current = null
    }
  }, [duration, isPlaying, onPlayPause, onCurrentTimeChange])

  const segments = useMemo(() => timeline?.segments ?? [], [timeline])
  const isGenerationInProgress = onGenerateVideo ? isGeneratingRender : isGenerating
  const generationStatusLabel = useMemo(() => {
    const status = generationStatus ?? generationJob?.status
    if (!status) return null

    switch (status) {
      case "queued":
        return "Queued"
      case "processing":
        return "Processing…"
      case "completed":
        return "Completed"
      case "failed":
        return "Failed"
      default:
        return status
    }
  }, [generationJob?.status, generationStatus])

  const generationProgressValue = useMemo(() => {
    if (typeof generationProgress === "number") {
      return Math.round(Math.max(0, Math.min(100, generationProgress)))
    }
    if (!generationJob) return Math.round(localGenerationProgress)
    const progress = generationJob.result?.progress
    return typeof progress === "number" ? Math.round(progress) : Math.round(localGenerationProgress)
  }, [generationJob, generationProgress, localGenerationProgress])

  const generationStageLabel = useMemo(() => {
    if (typeof generationStage === "string" && generationStage.trim().length > 0) {
      return generationStage
    }

    const stage = generationJob?.result?.stage
    if (typeof stage === "string" && stage.trim().length > 0) {
      return stage
    }

    return generationStatusLabel
  }, [generationJob, generationStage, generationStatusLabel])

  const handleGenerateVideo = async () => {
    if (onGenerateVideo) {
      await onGenerateVideo()
      return
    }

    setIsGenerating(true)
    setLocalGenerationProgress(0)
    const interval = setInterval(() => {
      setLocalGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsGenerating(false)
          return 100
        }
        return prev + Math.random() * 30
      })
    }, 300)
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickRatio = clickX / rect.width
    setCurrentTime(clickRatio * duration)
  }

  const handleAddSegment = () => {
    if (!timeline || !onTimelineChange || !timeline.tracks[0]) return
    const start = Math.max(0, duration - 2)
    const next: EditorTimeline = {
      ...timeline,
      durationSeconds: duration + 2,
      segments: [
        ...timeline.segments,
        {
          id: crypto.randomUUID(),
          projectId: timeline.projectId,
          timelineId: timeline.id,
          ownerId: timeline.ownerId,
          trackId: timeline.tracks[0].id,
          assetId: null,
          label: `Segment ${timeline.segments.length + 1}`,
          segmentType: "clip",
          startSeconds: start,
          endSeconds: start + 2,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    setDuration(next.durationSeconds)
    onTimelineChange(next)
  }

  return (
    <div className="flex-1 flex flex-col bg-background p-4 overflow-hidden gap-3">
      <div className="flex-1 bg-gradient-to-b from-card to-background rounded-lg border border-border overflow-hidden relative group shadow-lg">
        <div className="w-full h-full flex items-center justify-center bg-black/50">
          <canvas ref={canvasRef} className="w-full h-full max-w-4xl max-h-full object-contain" />
          <video ref={videoRef} className="hidden w-full h-full" crossOrigin="anonymous" />

          {isGenerationInProgress && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <Loader className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-white font-semibold">Generating video...</p>
                <p className="text-white/70 text-sm mt-1">{generationProgressValue}%</p>
              </div>
              <p className="text-white/70 text-xs">{generationStageLabel ?? "Preparing..."}</p>
              <Progress value={generationProgressValue} className="w-48 h-2" />
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <MediaControls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            volume={volume}
            onVolumeChange={setVolume}
            currentTime={currentTime}
            duration={duration}
            onSeek={setCurrentTime}
            compact
          />
        </div>

        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 hover:bg-red-600/90 px-3 py-2 rounded-full text-white text-sm transition-colors">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Recording
          </div>
        )}
      </div>

      {showAdvancedControls && (
        <div className="bg-card border border-border rounded-lg p-4">
          <MediaControls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            volume={volume}
            onVolumeChange={setVolume}
            currentTime={currentTime}
            duration={duration}
            onSeek={setCurrentTime}
            onSkipPrevious={onSkipPrevious}
            onSkipNext={onSkipNext}
            onSettings={() => setShowAdvancedControls(false)}
          />
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
          <span className="text-xs text-muted-foreground">Model: <span className="font-medium text-foreground">{selectedModel.toUpperCase()}</span></span>
        </div>

        {generationStatusLabel && (
          <div className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
              {generationStatusLabel}
            </span>
            {typeof generationProgress === "number" && <span>{generationProgressValue}%</span>}
            {typeof generationProgress === "number" && generationStageLabel && (
              <span className="text-foreground/90">{generationStageLabel}</span>
            )}
          </div>
        )}

        <div ref={timelineRef} onClick={handleTimelineClick} className="w-full h-12 bg-background border border-border rounded cursor-pointer hover:border-primary/50 transition-colors relative">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="absolute h-full bg-gradient-to-r from-primary/70 to-accent/70 hover:from-primary hover:to-accent rounded transition-colors group cursor-grab active:cursor-grabbing"
              style={{ left: `${(segment.startSeconds / duration) * 100}%`, width: `${((segment.endSeconds - segment.startSeconds) / duration) * 100}%` }}
              title={segment.label}
            >
              <span className="text-xs font-semibold text-primary-foreground px-2 py-1 truncate block opacity-0 group-hover:opacity-100">{segment.label}</span>
            </div>
          ))}
          <div className="absolute top-0 h-full w-0.5 bg-white pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }} />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void handleGenerateVideo()} disabled={isGenerationInProgress} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            {isGenerationInProgress ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Generate Video
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="gap-2 bg-transparent"
            title="Upload Media"
            aria-label="Upload media"
            onClick={() => document.getElementById("editor-media-upload")?.click()}
            disabled={uploadInProgress}
          >
            <Upload className="w-4 h-4" />
          </Button>
          <input
            id="editor-media-upload"
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file && onUploadMedia) {
                void onUploadMedia(file)
              }
              event.currentTarget.value = ""
            }}
          />
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="gap-2 bg-transparent"
            title="Add Segment"
            aria-label="Add segment"
            onClick={handleAddSegment}
          >
            <PlusSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="gap-2 bg-transparent"
            title="Advanced Controls"
            aria-label={showAdvancedControls ? "Hide advanced controls" : "Show advanced controls"}
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
