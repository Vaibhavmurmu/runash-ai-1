"use client"

import type React from "react"

import { useState } from "react"
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkspaceLayoutProps {
  children: React.ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  const chatHistoryItems = [
    { id: 1, title: "Video Editing Tips", time: "2 hours ago" },
    { id: 2, title: "Stream Setup Guide", time: "Yesterday" },
    { id: 3, title: "Model Comparison", time: "2 days ago" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
          >
            {leftPanelOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
          <h1 className="font-semibold">Workspace</h1>
        </div>
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
        >
          {rightPanelOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Chat History */}
        <aside
          className={cn(
            "border-r border-border bg-card transition-all duration-300 overflow-hidden flex flex-col",
            leftPanelOpen ? "w-64" : "w-0",
          )}
        >
          <div className="p-4 border-b border-border">
            <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatHistoryItems.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.time}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Right Panel - Settings/Info */}
        <aside
          className={cn(
            "border-l border-border bg-card transition-all duration-300 overflow-hidden flex flex-col",
            rightPanelOpen ? "w-80" : "w-0",
          )}
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Chat Settings</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Tone</label>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>Professional</option>
                <option>Casual</option>
                <option>Creative</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Model</label>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>GPT-4 Vision</option>
                <option>Claude 3 Opus</option>
                <option>WAN 2.1</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                Enable suggestions
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
