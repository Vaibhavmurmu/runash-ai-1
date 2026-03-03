import { BackgroundSync } from "./background-sync"
import type {
  CloudStorageProvider,
  RecordedStream,
  RecordingSettings,
  StorageUsage,
  StreamHighlight,
} from "@/types/recording"

export interface RecordingData {
  id: string
  title: string
  description?: string
  duration: number
  fileSize: number
  thumbnailUrl?: string
  recordingUrl?: string
  playbackUrl?: string
  status: "scheduled" | "recording" | "processing" | "completed" | "failed"
  quality: string
  createdAt: string
  updatedAt: string
  userId: string
  tags: string[]
  isPublic: boolean
  isProcessing: boolean
  viewCount: number
  streamId?: string
}

export interface CreateRecordingData {
  title: string
  description?: string
  streamId?: string
  duration?: number
  quality?: string
}

export interface UpdateRecordingData {
  title?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
  thumbnailUrl?: string
}

export interface LibraryQueryParams {
  page?: number
  pageSize?: number
  segment?: "recent" | "latest" | "previous" | "all"
  search?: string
  sort?: "date-desc" | "date-asc" | "title-asc" | "title-desc" | "views-desc" | "views-asc"
  platform?: string
  status?: string
}

export interface LibraryResponse {
  items: RecordedStream[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

interface SaveEditedVideoPayload {
  originalId: string
  title: string
  startTime: string
  endTime: string
  filters: Record<string, unknown>
  audioLevel: number
  exportSettings: Record<string, unknown>
}

export class RecordingService {
  private static instance: RecordingService
  private recordingListeners: ((recordings: RecordingData[]) => void)[] = []
  private backgroundSync: BackgroundSync

  private constructor() {
    this.backgroundSync = BackgroundSync.getInstance()
  }

  public static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService()
    }
    return RecordingService.instance
  }

  private static get service() {
    return RecordingService.getInstance()
  }

  private async request<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init)
    if (!response.ok) {
      let message = "Request failed"
      try {
        const data = await response.json()
        message = data?.error || message
      } catch {
        // ignore json parse failures and use generic fallback
      }
      throw new Error(message)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  private toRecordedStream(recording: RecordingData): RecordedStream {
    return {
      id: recording.id,
      title: recording.title,
      description: recording.description,
      thumbnailUrl: recording.thumbnailUrl,
      recordingUrl: recording.playbackUrl || recording.recordingUrl || "",
      duration: recording.duration,
      fileSize: recording.fileSize,
      createdAt: recording.createdAt,
      platforms: [],
      viewCount: recording.viewCount,
      downloadCount: 0,
      isProcessing: recording.isProcessing,
      isPublic: recording.isPublic,
      tags: recording.tags || [],
      highlights: [],
      chapters: [],
      quality: recording.quality as "low" | "medium" | "high" | "source",
      format: "mp4",
    }
  }

  public async createRecording(data: CreateRecordingData): Promise<RecordingData> {
    const { recording } = await this.request<{ recording: RecordingData }>("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    this.backgroundSync.addToSyncQueue({
      type: "recording",
      action: "create",
      data: recording,
    })

    this.notifyRecordingListeners()
    return recording
  }

  public async getUserRecordings(): Promise<RecordingData[]> {
    const { recordings } = await this.request<{ recordings: RecordingData[] }>("/api/recordings")
    return recordings
  }

  public async getStreamRecordings(streamId: string): Promise<RecordingData[]> {
    const { recordings } = await this.request<{ recordings: RecordingData[] }>(`/api/recordings?streamId=${streamId}`)
    return recordings
  }

  public async getRecording(id: string): Promise<RecordingData | null> {
    try {
      const { recording } = await this.request<{ recording: RecordingData }>(`/api/recordings/${id}`)
      return recording
    } catch {
      return null
    }
  }

  public async updateRecording(id: string, data: UpdateRecordingData): Promise<RecordingData> {
    const { recording } = await this.request<{ recording: RecordingData }>(`/api/recordings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    this.backgroundSync.addToSyncQueue({
      type: "recording",
      action: "update",
      data: recording,
    })

    this.notifyRecordingListeners()
    return recording
  }

  public async deleteRecording(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/recordings/${id}`, {
      method: "DELETE",
    })

    this.notifyRecordingListeners()
  }

  public async uploadRecording(streamId: string, file: File, duration: number): Promise<RecordingData> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("streamId", streamId)
    formData.append("duration", duration.toString())

    const { recording } = await this.request<{ recording: RecordingData }>("/api/recordings/upload", {
      method: "POST",
      body: formData,
    })

    this.notifyRecordingListeners()
    return recording
  }

  public async getLibraryRecordings(params: LibraryQueryParams = {}): Promise<LibraryResponse> {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 12),
      segment: params.segment ?? "all",
      search: params.search ?? "",
      sort: params.sort ?? "date-desc",
      platform: params.platform ?? "all",
      status: params.status ?? "all",
    })

    const response = await this.request<{
      data?: {
        items: RecordedStream[]
        pagination: LibraryResponse["pagination"]
      }
      items?: RecordedStream[]
      pagination?: LibraryResponse["pagination"]
    }>(`/api/streams/library?${searchParams.toString()}`)

    const payload = response.data ?? response
    return {
      items: payload.items ?? [],
      pagination: payload.pagination ?? {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
        total: 0,
        hasMore: false,
      },
    }
  }

  public async getRecordings(): Promise<RecordedStream[]> {
    const library = await this.getLibraryRecordings({ page: 1, pageSize: 100 })
    return library.items
  }

  public async getStorageUsage(): Promise<StorageUsage> {
    const { usage } = await this.request<{ usage: StorageUsage }>("/api/recordings/storage")
    return usage
  }

  public async downloadRecording(recordingId: string): Promise<void> {
    const { downloadUrl } = await this.request<{ downloadUrl: string }>(`/api/recordings/${recordingId}/download`)
    window.open(downloadUrl, "_blank", "noopener,noreferrer")
  }

  public async shareRecording(recordingId: string): Promise<string> {
    const { shareUrl } = await this.request<{ shareUrl: string }>(`/api/recordings/${recordingId}/share`, {
      method: "POST",
    })
    return shareUrl
  }

  public async createClip(recordingId: string, clip: StreamHighlight): Promise<void> {
    await this.request<{ success: boolean }>("/api/recordings/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingId, clip }),
    })
  }

  public async saveEditedVideo(editedVideo: SaveEditedVideoPayload): Promise<void> {
    await this.request<{ success: boolean }>("/api/recordings/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editedVideo),
    })
  }

  public async updateSettings(settings: RecordingSettings): Promise<RecordingSettings> {
    const { settings: updatedSettings } = await this.request<{ settings: RecordingSettings }>("/api/recordings/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })

    this.backgroundSync.addToSyncQueue({
      type: "settings",
      action: "update",
      data: updatedSettings,
    })

    return updatedSettings
  }

  public async getSettings(): Promise<RecordingSettings> {
    const { settings } = await this.request<{ settings: RecordingSettings }>("/api/recordings/settings")
    return settings
  }

  public onRecordingsChange(callback: (recordings: RecordingData[]) => void): () => void {
    this.recordingListeners.push(callback)
    return () => {
      this.recordingListeners = this.recordingListeners.filter((cb) => cb !== callback)
    }
  }

  private notifyRecordingListeners(): void {
    this.getUserRecordings().then((recordings) => {
      this.recordingListeners.forEach((listener) => listener(recordings))
    })
  }

  public static getRecordings() {
    return RecordingService.service.getRecordings()
  }

  public static getLibraryRecordings(params: LibraryQueryParams = {}) {
    return RecordingService.service.getLibraryRecordings(params)
  }

  public static getStorageUsage() {
    return RecordingService.service.getStorageUsage()
  }

  public static deleteRecording(id: string) {
    return RecordingService.service.deleteRecording(id)
  }

  public static downloadRecording(id: string) {
    return RecordingService.service.downloadRecording(id)
  }

  public static shareRecording(id: string) {
    return RecordingService.service.shareRecording(id)
  }

  public static createClip(recordingId: string, clip: StreamHighlight) {
    return RecordingService.service.createClip(recordingId, clip)
  }

  public static saveEditedVideo(payload: SaveEditedVideoPayload) {
    return RecordingService.service.saveEditedVideo(payload)
  }

  public static updateSettings(settings: RecordingSettings) {
    return RecordingService.service.updateSettings(settings)
  }

  public static getSettings() {
    return RecordingService.service.getSettings()
  }
}

export const DEFAULT_CLOUD_PROVIDERS: CloudStorageProvider[] = [
  { id: "s3", name: "AWS S3", icon: "cloud", isConnected: false, usedSpace: 0, totalSpace: 0 },
  { id: "gcs", name: "Google Cloud Storage", icon: "cloud", isConnected: false, usedSpace: 0, totalSpace: 0 },
]
