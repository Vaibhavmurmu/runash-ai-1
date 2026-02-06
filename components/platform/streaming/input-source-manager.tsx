"use client"

import { Monitor, Webcam, Globe, Plus } from "lucide-react"

export default function InputSourceManager() {
  const inputSources = [
    {
      id: "screen",
      name: "Screen Share",
      icon: Monitor,
      status: "ready",
      description: "Share your entire screen or a window",
    },
    {
      id: "webcam",
      name: "Webcam",
      icon: Webcam,
      status: "ready",
      description: "Your camera input for streaming",
    },
    {
      id: "web",
      name: "Web Preview",
      icon: Globe,
      status: "ready",
      description: "Browse and share web pages",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inputSources.map((source) => {
          const Icon = source.icon
          return (
            <div key={source.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">{source.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{source.description}</p>
              <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                <Plus className="h-4 w-4" />
                Add Source
              </button>
            </div>
          )
        })}
      </div>

      {/* Active Sources */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Active Sources</h3>
        <div className="space-y-2">
          {["Screen Share - Main Monitor", "Webcam - Built-in"].map((source, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
              <span className="text-sm">{source}</span>
              <button className="text-xs px-2 py-1 hover:bg-muted-foreground/20 rounded transition-colors">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
