export type EditorProjectStatus = "draft" | "ready" | "archived"
export type EditorRenderStatus = "queued" | "processing" | "completed" | "failed"

export interface EditorAsset {
  id: string
  projectId: string
  ownerId: string
  source: "upload" | "storage"
  uploadFileId: string | null
  storageKey: string
  accessUrl: string | null
  mimeType: string
  sizeBytes: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EditorSegment {
  id: string
  projectId: string
  timelineId: string
  ownerId: string
  trackId: string
  assetId: string | null
  label: string
  segmentType: string
  startSeconds: number
  endSeconds: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EditorTrack {
  id: string
  timelineId: string
  projectId: string
  ownerId: string
  label: string
  orderIndex: number
  trackType: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EditorTimeline {
  id: string
  projectId: string
  ownerId: string
  name: string
  frameRate: number
  durationSeconds: number
  metadata: Record<string, unknown>
  tracks: EditorTrack[]
  segments: EditorSegment[]
  createdAt: string
  updatedAt: string
}

export interface EditorRenderJob {
  id: string
  projectId: string
  ownerId: string
  status: EditorRenderStatus
  requestedBy: string
  payload: Record<string, unknown>
  result: Record<string, unknown>
  outputAssetId: string | null
  createdAt: string
  updatedAt: string
}

export interface EditorProject {
  id: string
  ownerId: string
  name: string
  status: EditorProjectStatus
  metadata: Record<string, unknown>
  activeTimelineId: string | null
  timelines: EditorTimeline[]
  assets: EditorAsset[]
  renderJobs: EditorRenderJob[]
  createdAt: string
  updatedAt: string
}
