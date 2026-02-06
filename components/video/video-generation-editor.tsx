'use client'

import React, { useState } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Settings, Layers, Wand2,
  RefreshCw, Download, Share2, Save, Undo2, Redo2, Plus,
  Trash2, Copy, Lock, Eye, EyeOff, ChevronDown, Sparkles,
  Zap, Video, Music, Type, ImageIcon, Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio' | 'text' | 'effects'
  duration: number
  clips: Array<{
    id: string
    name: string
    startTime: number
    duration: number
    effects: string[]
  }>
  volume: number
  visible: boolean
  locked: boolean
}

interface GenerationParams {
  prompt: string
  style: string
  duration: number
  aspectRatio: string
  quality: string
  model: string
  seed?: number
}

export default function VideoGenerationEditor() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(120)
  const [volume, setVolume] = useState(80)
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'settings'>('editor')

  const [generationParams, setGenerationParams] = useState<GenerationParams>({
    prompt: 'Create a cinematic introduction video with modern graphics',
    style: 'cinematic',
    duration: 30,
    aspectRatio: '16:9',
    quality: '4K',
    model: 'WAN 2.1',
  })

  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'video-1',
      name: 'Main Video',
      type: 'video',
      duration: 120,
      clips: [
        {
          id: 'clip-1',
          name: 'Scene 1',
          startTime: 0,
          duration: 45,
          effects: ['color-grade'],
        },
        {
          id: 'clip-2',
          name: 'Scene 2',
          startTime: 45,
          duration: 75,
          effects: [],
        },
      ],
      volume: 100,
      visible: true,
      locked: false,
    },
    {
      id: 'audio-1',
      name: 'Background Music',
      type: 'audio',
      duration: 120,
      clips: [
        {
          id: 'audio-clip-1',
          name: 'Track',
          startTime: 0,
          duration: 120,
          effects: ['fade-in', 'fade-out'],
        },
      ],
      volume: 60,
      visible: true,
      locked: false,
    },
  ])

  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      // Simulate generation complete
    }, 3000)
  }

  const toggleTrackVisibility = (trackId: string) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, visible: !track.visible } : track
    ))
  }

  const toggleTrackLock = (trackId: string) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, locked: !track.locked } : track
    ))
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              Video Generation Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Undo">
              <Undo2 className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Redo">
              <Redo2 className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-border/40" />
            <button className="px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              Save
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              Export
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('editor')}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
              viewMode === 'editor'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
              viewMode === 'preview'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
              viewMode === 'settings'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            Generation Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Canvas Area */}
        {viewMode === 'editor' || viewMode === 'preview' ? (
          <>
            {/* Left: Timeline and Layers */}
            <div className="w-64 border-r border-border/40 bg-sidebar overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                    Layers
                  </h3>
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrack(track.id)}
                      className={cn(
                        "mb-2 p-3 rounded-lg border border-border/40 cursor-pointer transition-colors",
                        selectedTrack === track.id
                          ? "bg-primary/20 border-primary"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {track.type === 'video' && <Video className="w-4 h-4 text-blue-500" />}
                          {track.type === 'audio' && <Music className="w-4 h-4 text-purple-500" />}
                          {track.type === 'text' && <Type className="w-4 h-4 text-green-500" />}
                          {track.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleTrackVisibility(track.id)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {track.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleTrackLock(track.id)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {track.locked ? (
                            <Lock className="w-4 h-4 text-orange-500" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Add Track
                </button>
              </div>
            </div>

            {/* Center: Preview */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                {viewMode === 'preview' ? (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-20 h-20 text-primary mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">Video preview will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-slate-900 to-black w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground text-sm">Canvas: Click to select elements</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="border-t border-border/40 bg-background/80 backdrop-blur-md p-4 space-y-4">
                {/* Timeline Scrubber */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.floor(currentTime)}s</span>
                    <span>{Math.floor(duration)}s</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                      )}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground w-8">{volume}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Effects">
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Settings">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Properties/Effects */}
            <div className="w-64 border-l border-border/40 bg-sidebar overflow-y-auto p-4">
              {selectedTrack ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                      Track Properties
                    </h3>
                    <div className="space-y-2">
                      <label className="block text-sm">
                        <span className="text-muted-foreground mb-1 block">Volume</span>
                        <input type="range" min="0" max="100" defaultValue="80" className="w-full" />
                      </label>
                      <label className="block text-sm">
                        <span className="text-muted-foreground mb-1 block">Speed</span>
                        <select className="w-full bg-muted border border-border/40 px-2 py-1 rounded text-sm">
                          <option>0.5x</option>
                          <option>1x</option>
                          <option>1.5x</option>
                          <option>2x</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                      Effects
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border/40 hover:border-primary/50 rounded-lg text-sm font-medium transition-colors">
                        <Wand2 className="w-4 h-4" />
                        Add Effect
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">Select a track to edit properties</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Generation Settings View */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-8 space-y-8">
              {/* Generation Prompt */}
              <div className="bg-card border border-border/40 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generation Prompt
                </h2>
                <textarea
                  value={generationParams.prompt}
                  onChange={(e) =>
                    setGenerationParams({ ...generationParams, prompt: e.target.value })
                  }
                  className="w-full bg-muted border border-border/40 rounded-lg p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-24 resize-none"
                  placeholder="Describe the video you want to generate..."
                />
              </div>

              {/* Generation Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border/40 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3">Model</label>
                  <select
                    value={generationParams.model}
                    onChange={(e) =>
                      setGenerationParams({ ...generationParams, model: e.target.value })
                    }
                    className="w-full bg-muted border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option>WAN 2.1</option>
                    <option>Runway Gen-3</option>
                    <option>Sora</option>
                  </select>
                </div>

                <div className="bg-card border border-border/40 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3">Style</label>
                  <select
                    value={generationParams.style}
                    onChange={(e) =>
                      setGenerationParams({ ...generationParams, style: e.target.value })
                    }
                    className="w-full bg-muted border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option>cinematic</option>
                    <option>documentary</option>
                    <option>animated</option>
                    <option>realistic</option>
                  </select>
                </div>

                <div className="bg-card border border-border/40 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3">Duration (seconds)</label>
                  <input
                    type="number"
                    value={generationParams.duration}
                    onChange={(e) =>
                      setGenerationParams({
                        ...generationParams,
                        duration: Number(e.target.value),
                      })
                    }
                    className="w-full bg-muted border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="bg-card border border-border/40 rounded-lg p-6">
                  <label className="block text-sm font-semibold mb-3">Aspect Ratio</label>
                  <select
                    value={generationParams.aspectRatio}
                    onChange={(e) =>
                      setGenerationParams({
                        ...generationParams,
                        aspectRatio: e.target.value,
                      })
                    }
                    className="w-full bg-muted border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option>16:9</option>
                    <option>9:16</option>
                    <option>1:1</option>
                    <option>4:3</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-primary text-primary-foreground px-6 py-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-bold flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
