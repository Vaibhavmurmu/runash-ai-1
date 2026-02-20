"use client"

import { Button } from "@/components/ui/button"
import { Circle, Settings, Share2, Cloud, Webcam, Users, Loader2, MoreHorizontal } from "lucide-react"
import InputTools from "./input-tools"
import SettingsPanel from "./settings-panel"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
  const isMobile = useIsMobile()

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-border bg-card shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="font-bold text-base md:text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">RunAsh AI</div>
          <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Editor</div>
        </div>

        <div className="flex items-center gap-2" aria-label="Editor actions">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => setInputToolsOpen(true)}
            aria-label="Open input tools"
            aria-haspopup="dialog"
            aria-expanded={inputToolsOpen}
          >
            <Webcam className="w-4 h-4" />
            <span className="hidden md:inline">Inputs</span>
          </Button>

          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => onRecordingToggle(!isRecording)}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <Circle className="w-2 h-2 fill-current" />
            <span className="hidden sm:inline">{isRecording ? "Stop" : "Record"}</span>
          </Button>

          {!isMobile && (
            <>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onSave} disabled={isSaving} aria-label="Save project">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                Save
              </Button>

              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onOpenCollaboration} aria-label="Open collaboration panel">
                <Users className="w-4 h-4" />
                Collaborate
              </Button>

              <Button variant="outline" size="sm" className="gap-2 bg-transparent" aria-label="Share project">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="More top bar actions">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void onSave?.()}>
                <Cloud className="w-4 h-4" />
                Save
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCollaboration}>
                <Users className="w-4 h-4" />
                Collaborate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} aria-label="Open settings" aria-haspopup="dialog" aria-expanded={settingsOpen}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <InputTools isOpen={inputToolsOpen} onClose={() => setInputToolsOpen(false)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
