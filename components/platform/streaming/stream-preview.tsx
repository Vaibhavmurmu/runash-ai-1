"use client"

import { Volume2, Settings } from "lucide-react"

interface StreamPreviewProps {
  isLive: boolean
  streamData: {
    viewers: number
    duration: string
    bitrate: string
    fps: number
  }
}

export default function StreamPreview({ isLive, streamData }: StreamPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Main Preview */}
      <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
        {isLive ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-white text-lg">LIVE STREAM ACTIVE</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-2">📹</div>
            <p className="text-white">Ready to stream</p>
          </div>
        )}

        {/* Floating HUD */}
        {isLive && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur rounded-lg p-3 text-white text-sm space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
            <div className="font-mono">{streamData.duration}</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors">
            <Volume2 className="h-5 w-5 text-white" />
          </button>
          <button className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors">
            <Settings className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Viewers", value: streamData.viewers.toLocaleString() },
          { label: "Duration", value: streamData.duration },
          { label: "Bitrate", value: streamData.bitrate },
          { label: "FPS", value: streamData.fps.toString() },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
