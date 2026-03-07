"use client"

import { createContext, useContext } from "react"
import type { EditorProject, EditorSegment, EditorTimeline } from "@/lib/editor/domain"

export interface EditorPanelContextValue {
  project?: EditorProject | null
  activeTimeline?: EditorTimeline
  selectedSegment?: EditorSegment
  playheadSeconds: number
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
