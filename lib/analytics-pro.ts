export interface AnalyticsDataset {
  id: string
  name: string
  description: string
  source: "stream" | "upload" | "audience" | "chat"
  records: number
  tags: string[]
  updatedAt: string
}

export interface StudioConsentPayload {
  allowMic: boolean
  allowCamera: boolean
  allowScreenShare: boolean
  allowRecording: boolean
  preferredLanguage: "en" | "hi"
}

export interface StudioRecordingPayload {
  title: string
  storage: "cloud" | "local"
  durationSeconds: number
  includeTranscript: boolean
  streamId: string
}
