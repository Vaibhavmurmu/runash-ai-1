export interface RecordingSettings {
  autoRecord: boolean
  recordAudio: boolean
  recordVideo: boolean
  quality: "low" | "medium" | "high" | "source"
  format: "mp4" | "webm" | "mkv"
  storage: "local" | "cloud"
  maxStorageGB: number
  autoDelete: boolean
  autoDeleteAfterDays: number
  saveChat: boolean
  createHighlights: boolean
}

export interface RecordedStream {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  recordingUrl: string
  duration: number // in seconds
  fileSize: number // in bytes
  createdAt: string // ISO date string
  platforms: string[] // platforms it was streamed to
  viewCount: number
  downloadCount: number
  isProcessing: boolean
  isPublic: boolean
  tags: string[]
  status?: string
  sourceType?: "recording" | "stream"
  segment?: "recent" | "latest" | "previous"
  category?: string
  chapters?: StreamChapter[]
  highlights?: StreamHighlight[]
}

export interface StreamChapter {
  id: string
  title: string
  startTime: number // in seconds
  endTime?: number // in seconds
  thumbnailUrl?: string
}

export interface StreamHighlight {
  id: string
  title: string
  startTime: number // in seconds
  endTime: number // in seconds
  thumbnailUrl?: string
  clipUrl?: string
  viewCount: number
}

export interface StorageUsage {
  used: number // in bytes
  total: number // in bytes
  recordings: number // count of recordings
  oldestRecordingDate?: string // ISO date string
}

export interface CloudStorageProvider {
  id: string
  name: string
  icon: string
  isConnected: boolean
  usedSpace: number // in bytes
  totalSpace: number // in bytes
}
