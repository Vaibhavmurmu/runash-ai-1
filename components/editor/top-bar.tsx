"use client"

import { Button } from "@/components/ui/button"
import { Circle, Settings, Share2, Cloud, Webcam, Users, Loader2 } from "lucide-react"
import InputTools from "./input-tools"
import SettingsPanel from "./settings-panel"
import { useState } from "react"

interface TopBarProps {
  isRecording: boolean
  onRecordingToggle: (value: boolean) => void
  onOpenCollaboration?: () => void
  onSave?: () => Promise<void> | void
  isSaving?: boolean
}

export default function TopBar({ isRecording, onRecordingToggle, onOpenCollaboration, onSave, isSaving = false }: TopBarProps) {
  const [inputToolsOpen, setInputToolsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">RunAsh AI</div>
          <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Editor</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-border pr-3">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setInputToolsOpen(true)} title="Open input tools">
              <Webcam className="w-4 h-4" />
              <span className="hidden sm:inline">Inputs</span>
            </Button>
          </div>

          <Button variant={isRecording ? "destructive" : "outline"} size="sm" className="gap-2" onClick={() => onRecordingToggle(!isRecording)}>
            <Circle className="w-2 h-2 fill-current" />
            {isRecording ? "Stop" : "Record"}
          </Button>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Save
          </Button>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onOpenCollaboration}>
            <Users className="w-4 h-4" />
            Collaborate
          </Button>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Share2 className="w-4 h-4" />
            Share
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <InputTools isOpen={inputToolsOpen} onClose={() => setInputToolsOpen(false)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
