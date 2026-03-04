export type GenerationQualityMode = "quality" | "speed"

export interface VideoGenerationRequest {
  modelId: string
  prompt?: string
  negativePrompt?: string
  fps?: number
  durationSeconds?: number
  durationPreset?: string
  aspectRatio?: string
  resolution?: string
  seed?: number
  qualityMode?: GenerationQualityMode
  [key: string]: unknown
}

export interface VideoGenerationProgress {
  jobId: string
  provider: string
  status: "queued" | "processing" | "completed" | "failed" | "canceled"
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

export interface VideoModelExecutionOutput {
  providerRequest: VideoGenerationRequest
  progress: VideoGenerationProgress
  result: VideoGenerationResult
}

export type VideoModelExecutionErrorCode = "VIDEO_MODEL_UNSUPPORTED" | "VIDEO_MODEL_EXECUTION_FAILED" | "VIDEO_MODEL_VALIDATION_FAILED"

export class VideoModelExecutionError extends Error {
  constructor(
    public readonly code: VideoModelExecutionErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "VideoModelExecutionError"
  }
}

export interface VideoModelProviderAdapter {
  provider: "wan" | "runway" | "stability"
  supportsModel(modelId: string): boolean
  execute(request: VideoGenerationRequest): Promise<VideoModelExecutionOutput>
}
