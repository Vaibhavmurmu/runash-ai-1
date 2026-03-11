"use client"

import { createContext, useContext } from "react"
import type { EditorProject, EditorRenderJob, EditorSegment, EditorTimeline } from "@/lib/editor/domain"

export interface EditorPanelContextValue {
  project?: EditorProject | null
  activeTimeline?: EditorTimeline
  onTimelineChange: (timeline: EditorTimeline) => void
  selectedSegment?: EditorSegment
  playheadSeconds: number
  generationHistory: EditorRenderJob[]
  generationActionState: {
    cancelingJobId: string | null
    retryingJobId: string | null
  }
  onCancelRenderJob: (jobId: string) => void
  onRetryRenderJob: (jobId: string) => void
}

const EditorPanelContext = createContext<EditorPanelContextValue | null>(null)

export function EditorPanelContextProvider({
  value,
  children,
}: {
  value: EditorPanelContextValue
  children: React.ReactNode
}) {
  return <EditorPanelContext.Provider value={value}>{children}</EditorPanelContext.Provider>
}

export function useEditorPanelContext(): EditorPanelContextValue {
  const context = useContext(EditorPanelContext)
  if (!context) {
    throw new Error("useEditorPanelContext must be used within EditorPanelContextProvider")
  }
  return context
}
