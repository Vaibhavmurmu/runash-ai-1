"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Loader, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import MediaControls from "./media-controls"
import type { EditorTimeline } from "@/lib/editor/domain"

interface MainCanvasProps {
  selectedModel: string
  isRecording: boolean
  timeline?: EditorTimeline
  onTimelineChange?: (timeline: EditorTimeline) => void
  onUploadMedia?: (file: File) => Promise<void>
  uploadInProgress?: boolean
}

export default function MainCanvas({
  selectedModel,
  isRecording,
  timeline,
  onTimelineChange,
  onUploadMedia,
  uploadInProgress = false,
}: MainCanvasProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(timeline?.durationSeconds ?? 10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [volume, setVolume] = useState(80)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    setDuration(timeline?.durationSeconds ?? 10)
  }, [timeline?.durationSeconds])
  const segments = useMemo(() => timeline?.segments ?? [], [timeline])

  const handleGenerateVideo = () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
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

          {isGenerating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <Loader className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-white font-semibold">Generating video...</p>
                <p className="text-white/70 text-sm mt-1">{Math.round(generationProgress)}%</p>
              </div>
              <Progress value={generationProgress} className="w-48 h-2" />
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <MediaControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
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
            onPlayPause={() => setIsPlaying(!isPlaying)}
            volume={volume}
            onVolumeChange={setVolume}
            currentTime={currentTime}
            duration={duration}
            onSeek={setCurrentTime}
            onSettings={() => setShowAdvancedControls(false)}
          />
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
          <span className="text-xs text-muted-foreground">Model: <span className="font-medium text-foreground">{selectedModel.toUpperCase()}</span></span>
        </div>

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
          <Button onClick={handleGenerateVideo} disabled={isGenerating} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>Generate Video</>
            )}
          </Button>
          <Button variant="outline" size="icon" className="gap-2 bg-transparent" title="Upload Media" onClick={() => document.getElementById("editor-media-upload")?.click()} disabled={uploadInProgress}>
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
                onUploadMedia(file)
              }
            }}
          />
          <Button variant="outline" size="icon" className="gap-2 bg-transparent" title="Add Segment" onClick={handleAddSegment}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="gap-2 bg-transparent" title="Advanced Controls" onClick={() => setShowAdvancedControls(!showAdvancedControls)}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
