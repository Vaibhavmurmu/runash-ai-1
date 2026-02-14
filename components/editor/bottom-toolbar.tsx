"use client"

import { Button } from "@/components/ui/button"
import { Download, Share2, Trash2, Copy, MoreHorizontal, Settings, Loader2 } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import MCPDashboard from "./mcp-dashboard"

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

  return (
    <>
      <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Frame: <span className="font-semibold text-foreground">{frameLabel}</span> | Duration: <span className="font-semibold text-foreground">{durationLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={showMCPDashboard} onOpenChange={setShowMCPDashboard}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Processing</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-[600px] p-6">
              <MCPDashboard />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={isBusy} title="Duplicate project">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onExportMetadata} disabled={isBusy} title="Export metadata">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={isBusy} title="Delete project">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
