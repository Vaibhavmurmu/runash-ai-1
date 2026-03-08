export type EditorProjectStatus = "draft" | "processing" | "published" | "archived"

export interface EditorTimeline {
  duration: number
  fps: number
  tracks: Array<{
    id: string
    name: string
    type: "video" | "audio" | "text" | "overlay"
    segments: Array<{
      id: string
      start: number
      duration: number
      label: string
      assetId?: string
      config?: Record<string, unknown>
    }>
  }>
}

export interface EditorProject {
  id: string
  userId: string
  title: string
  description: string | null
  status: EditorProjectStatus
  selectedModel: string
  timeline: EditorTimeline
  settings: Record<string, unknown>
  metadata: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateEditorProjectInput {
  title: string
  description?: string
  selectedModel?: string
  timeline?: EditorTimeline
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateEditorProjectInput {
  title?: string
  description?: string | null
  status?: EditorProjectStatus
  selectedModel?: string
  timeline?: EditorTimeline
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
