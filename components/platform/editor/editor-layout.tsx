"use client"

import type React from "react"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditorLayoutProps {
  children: React.ReactNode
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
        <h1 className="font-semibold">Video Editor</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
            Export
          </button>
          <button className="px-3 py-1 bg-accent text-accent-foreground rounded text-sm hover:bg-accent/90">
            Share
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <aside
          className={cn(
            "border-r border-border bg-card transition-all duration-300 overflow-hidden flex flex-col",
            leftPanelOpen ? "w-72" : "w-0",
          )}
        >
          <div className="p-3 border-b border-border text-sm font-semibold">Layers</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {["Background", "Intro Text", "Main Video", "Outro"].map((layer) => (
              <div
                key={layer}
                className="p-2 bg-muted rounded text-sm cursor-pointer hover:bg-muted/80 transition-colors"
              >
                {layer}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Right Panel */}
        <aside
          className={cn(
            "border-l border-border bg-card transition-all duration-300 overflow-hidden flex flex-col",
            rightPanelOpen ? "w-72" : "w-0",
          )}
        >
          <div className="p-3 border-b border-border text-sm font-semibold">Properties</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Aspect Ratio</label>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Resolution</label>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Frame Rate</label>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>60 FPS</option>
                <option>30 FPS</option>
                <option>24 FPS</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Toggle Buttons */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-r transition-colors z-10"
        >
          {leftPanelOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-l transition-colors z-10"
        >
          {rightPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
