"use client"

import { X } from "lucide-react"

interface RightPanelProps {
  onClose: () => void
}

export default function RightPanel({ onClose }: RightPanelProps) {
  return (
    <aside className="w-80 border-l border-border bg-card overflow-y-auto animate-in slide-in-from-right-full">
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
        <h2 className="font-semibold">Settings & Controls</h2>
        <button onClick={onClose} className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Theme Settings */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Appearance</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="theme" defaultChecked className="w-4 h-4" />
              <span className="text-sm">Dark Mode</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="theme" className="w-4 h-4" />
              <span className="text-sm">Light Mode</span>
            </label>
          </div>
        </div>

        {/* Account Settings */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Account</h3>
          <button className="w-full px-3 py-2 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors">
            User Profile
          </button>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Notifications</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Email Notifications</span>
          </label>
        </div>

        {/* About */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">RunAsh AI Platform v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
