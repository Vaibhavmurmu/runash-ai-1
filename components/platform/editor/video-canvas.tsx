"use client"

import { useState } from "react"
import { Play, Pause, Volume2, Maximize2, Download, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoCanvasProps {
  videoState: {
    isGenerating: boolean
    progress: number
    duration: number
    currentTime: number
  }
  setVideoState: (state: any) => void
}

export default function VideoCanvas({ videoState, setVideoState }: VideoCanvasProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)

  const timelineSegments = [
    { name: "Intro", start: 0, duration: 20, color: "bg-blue-500" },
    { name: "Content", start: 20, duration: 60, color: "bg-green-500" },
    { name: "Outro", start: 80, duration: 40, color: "bg-purple-500" },
  ]

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      {/* Video Preview */}
      <div className="flex-1 bg-black rounded-lg relative overflow-hidden flex items-center justify-center">
        {videoState.isGenerating ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
            <p className="text-white">{Math.round(videoState.progress)}% Generated</p>
            <div className="w-64 h-2 bg-muted rounded-full mt-4 mx-auto overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${videoState.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <div className="text-6xl mb-2">🎬</div>
            <p>Ready to generate or upload your video</p>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2 backdrop-blur">
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 hover:bg-white/20 rounded transition-colors">
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </button>
          <button className="p-2 hover:bg-white/20 rounded transition-colors">
            <Volume2 className="h-5 w-5 text-white" />
          </button>
          <button className="p-2 hover:bg-white/20 rounded transition-colors">
            <Maximize2 className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      {showTimeline && (
        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm font-semibold">Timeline</div>
            <div className="flex-1 text-right text-xs text-muted-foreground">
              {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
            </div>
          </div>

          {/* Timeline Visual */}
          <div className="relative bg-muted rounded h-20">
            {timelineSegments.map((segment, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute h-full rounded flex items-center justify-center text-white text-xs font-medium",
                  segment.color,
                )}
                style={{
                  left: `${(segment.start / videoState.duration) * 100}%`,
                  width: `${(segment.duration / videoState.duration) * 100}%`,
                }}
              >
                {segment.name}
              </div>
            ))}
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
              style={{ left: `${(videoState.currentTime / videoState.duration) * 100}%` }}
            />
          </div>

          {/* Timeline Controls */}
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-sm transition-colors flex items-center gap-1">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
