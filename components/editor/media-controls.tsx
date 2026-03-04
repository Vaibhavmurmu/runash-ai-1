"use client"

import type React from "react"

import { useState } from "react"
import { Volume2, VolumeX, Maximize2, Settings, Play, Pause, SkipBack, SkipForward, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface MediaControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onSkipPrevious?: () => void
  onSkipNext?: () => void
  onFullscreen?: () => void
  onSettings?: () => void
  compact?: boolean
}

export default function MediaControls({
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
  currentTime,
  duration,
  onSeek,
  onSkipPrevious,
  onSkipNext,
  onFullscreen,
  onSettings,
  compact = false,
}: MediaControlsProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)

  const clampPercent = (value: number): number => Math.min(1, Math.max(0, value))
  const clampTooltipPercent = (value: number): number => Math.min(0.97, Math.max(0.03, value))

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = clampPercent((e.clientX - rect.left) / rect.width)
    onSeek(percent * duration)
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = clampPercent((e.clientX - rect.left) / rect.width)
    setHoverTime(percent * duration)
    setHoverPercent(percent)
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onPlayPause} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-white text-xs whitespace-nowrap">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer group" onClick={handleProgressClick}>
              <div
                className="h-full bg-primary rounded-full group-hover:bg-primary/80 transition-colors"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-white text-xs whitespace-nowrap">{formatTime(duration)}</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onVolumeChange(volume === 0 ? 80 : 0)}
                className="text-white hover:bg-white/20"
              >
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{volume === 0 ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 bg-card border border-border rounded-lg p-4">
        {/* Main controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-2" onClick={onSkipPrevious}>
                  <SkipBack className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Segment</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onPlayPause}
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-2" onClick={onSkipNext}>
                  <SkipForward className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Segment</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-2">
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Replay</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex items-center gap-2">
            {onSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onSettings} className="gap-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            )}

            {onFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onFullscreen} className="gap-2">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-2 bg-muted rounded-full cursor-pointer group relative"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => {
            setHoverTime(null)
            setHoverPercent(null)
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all group-hover:shadow-lg"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {hoverTime !== null && hoverPercent !== null && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full -top-2 bg-foreground text-background text-xs px-2 py-1 rounded pointer-events-none"
              style={{ left: `${clampTooltipPercent(hoverPercent) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={() => onVolumeChange(volume === 0 ? 80 : 0)} className="gap-2">
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{volume === 0 ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>

          <Slider
            min={0}
            max={100}
            step={5}
            value={[volume]}
            onValueChange={(value) => onVolumeChange(value[0])}
            className="flex-1"
          />
          <span className="text-sm font-medium text-muted-foreground w-8 text-right">{volume}%</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
