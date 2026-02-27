export interface VideoGenerationRequest {
  modelId: string
  prompt?: string
  negativePrompt?: string
  fps?: number
  durationSeconds?: number
  resolution?: string
  seed?: number
  [key: string]: unknown
}

export interface VideoGenerationProgress {
  jobId: string
  provider: string
  status: "queued" | "processing" | "completed" | "failed"
  progressPercent: number
  etaSeconds?: number
  detail?: string
}

export interface VideoGenerationResult {
  jobId: string
  provider: string
  modelId: string
  outputUrl?: string
  outputAssetId?: string
  mimeType?: string
  durationSeconds?: number
  resolution?: string
  seed?: number
  metadata?: Record<string, unknown>
}

export interface VideoModelProviderAdapter {
  provider: "wan" | "runway" | "stability"
  supportsModel(modelId: string): boolean
  normalizeRequest(request: VideoGenerationRequest): VideoGenerationRequest
}
