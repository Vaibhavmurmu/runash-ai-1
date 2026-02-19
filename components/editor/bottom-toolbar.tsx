"use client"

import { Button } from "@/components/ui/button"
import { Download, Share2, Trash2, Copy, MoreHorizontal, Settings, Loader2, SkipBack, SkipForward, Play } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import MCPDashboard from "./mcp-dashboard"
import { useIsMobile } from "@/hooks/use-mobile"

interface BottomToolbarProps {
  frameLabel?: string
  durationLabel?: string
  onDuplicate?: () => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onExportMetadata?: () => Promise<void> | void
  isBusy?: boolean
}

export default function BottomToolbar({
  frameLabel = "1 / 30",
  durationLabel = "2.5s",
  onDuplicate,
  onDelete,
  onExportMetadata,
  isBusy = false,
}: BottomToolbarProps) {
  const [showMCPDashboard, setShowMCPDashboard] = useState(false)
  const isMobile = useIsMobile()

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur px-3 md:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3 md:static md:bg-card md:backdrop-blur-none md:pb-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2 md:space-y-1 min-w-0">
        <div className="text-xs text-muted-foreground">
          Frame: <span className="font-semibold text-foreground">{frameLabel}</span> | Duration:{" "}
          <span className="font-semibold text-foreground">{durationLabel}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Timeline playback controls">
          <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Jump to previous marker">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Play timeline">
            <Play className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Jump to next marker">
            <SkipForward className="w-4 h-4" />
          </Button>
          <input
            aria-label="Timeline scrubber"
            type="range"
            min={0}
            max={100}
            defaultValue={10}
            className="h-3 w-40 md:w-full max-w-44 md:max-w-52 shrink-0"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Popover open={showMCPDashboard} onOpenChange={setShowMCPDashboard}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" aria-label="Open processing controls">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Processing</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-[92vw] max-w-[600px] p-4 md:p-6">
            <MCPDashboard />
          </PopoverContent>
        </Popover>

        {!isMobile && (
          <>
            <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={isBusy} title="Duplicate project" aria-label="Duplicate project">
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" title="Share" aria-label="Share project">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportMetadata}
              disabled={isBusy}
              title="Export metadata"
              aria-label="Export metadata"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={isBusy} title="Delete project" aria-label="Delete project">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Open more project actions">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void onDuplicate?.()}>
              <Copy className="w-4 h-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="w-4 h-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onExportMetadata?.()}>
              <Download className="w-4 h-4" />
              Export metadata
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onDelete?.()} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
