"use client"

import StreamManager from "@/components/editor/stream-manager"
import { useEditorPanelContext } from "./editor-panel-context"

export default function StreamPanel() {
  const { activeTimeline } = useEditorPanelContext()

  return (
    <div className="h-full min-h-0">
      <div className="px-4 pt-4 text-xs text-muted-foreground">Active timeline: {activeTimeline?.name ?? "No active timeline"}</div>
      <StreamManager />
    </div>
  )
}
