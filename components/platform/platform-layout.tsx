"use client"

import type React from "react"

import { useState } from "react"
import { Menu, X, ChevronRight, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import RightPanel from "./right-panel"
import { cn } from "@/lib/utils"

interface PlatformLayoutProps {
  children: React.ReactNode
  activeSection: string
  onSectionChange: (section: string) => void
}

/** @deprecated Use route-specific dashboard layouts under app/dashboard instead. */
export default function PlatformLayout({ children, activeSection, onSectionChange }: PlatformLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  const navigationItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "research", label: "Research", icon: "🔬" },
    { id: "model", label: "Model", icon: "🤖" },
    { id: "changelog", label: "Changelog", icon: "📝" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "community", label: "Community", icon: "👥" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold">
                R
              </div>
              RunAsh AI
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              className="hidden sm:block px-3 py-2 rounded-md bg-muted text-sm placeholder:text-muted-foreground"
            />
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside
          className={cn(
            "border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden",
          )}
        >
          <nav className="space-y-1 p-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {activeSection === item.id && <ChevronRight className="ml-auto h-4 w-4" />}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl">{children}</div>
        </main>

        {/* Right Panel */}
        {rightPanelOpen && <RightPanel onClose={() => setRightPanelOpen(false)} />}
      </div>
    </div>
  )
}
