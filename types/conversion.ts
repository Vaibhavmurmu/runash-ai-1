export type MediaFormat = {
  id: string
  name: string
  extension: string
  mimeType: string
  category: "video" | "audio" | "image"
  description?: string
}

export type ConversionPreset = {
  id: string
  name: string
  description: string
  targetFormat: string
  settings: ConversionSettings
}

export type ConversionSettings = {
  // Video settings
  resolution?: {
    width: number
    height: number
  }
  videoBitrate?: number // in kbps
  framerate?: number
  videoCodec?: string

  // Audio settings
  audioBitrate?: number // in kbps
  audioCodec?: string
  sampleRate?: number
  channels?: number

  // General settings
  quality?: number // 1-100
  preserveMetadata?: boolean
  stripAudio?: boolean
  stripVideo?: boolean
}

export type ConversionJob = {
  id: string
  fileId: string
  fileName: string
  sourceFormat: string
  targetFormat: string
  settings: ConversionSettings
  status: "queued" | "running" | "converting" | "succeeded" | "complete" | "failed" | "cancelled"
  progress: number
  startTime?: string
  endTime?: string
  error?: string
  outputFileId?: string
  idempotencyKey?: string
  attempts?: number
  maxAttempts?: number
}
