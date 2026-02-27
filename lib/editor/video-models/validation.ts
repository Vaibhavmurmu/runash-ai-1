import { z } from "zod"
import type { VideoGenerationRequest, VideoModelExecutionErrorCode } from "@/lib/editor/video-models/types"

const resolutionPattern = /^(?<width>\d{2,5})x(?<height>\d{2,5})$/i
const aspectRatioPattern = /^\d{1,2}:\d{1,2}$/
const sensitiveTokenPattern = /\b(?:sk|pk|rk)_(?:live|test|proj)_[A-Za-z0-9_-]{8,}\b|\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*\b|\b(?:api[_-]?key|secret|token)\s*[:=]\s*[^\s,;]+/gi

export const videoGenerationPayloadSchema = z
  .object({
    modelId: z.string().trim().min(1).max(120),
    prompt: z.string().trim().min(1).max(4000).optional(),
    negativePrompt: z.string().trim().min(1).max(4000).optional(),
    fps: z.coerce.number().int().min(1).max(120).optional(),
    durationSeconds: z.coerce.number().min(1).max(600).optional(),
    durationPreset: z.string().trim().min(1).max(30).optional(),
    aspectRatio: z.string().trim().regex(aspectRatioPattern, "aspectRatio must follow W:H (for example, 16:9)").optional(),
    resolution: z
      .string()
      .trim()
      .regex(resolutionPattern, "resolution must follow WIDTHxHEIGHT (for example, 1280x720)")
      .optional(),
    seed: z.coerce.number().int().min(0).max(2147483647).optional(),
    qualityMode: z.enum(["quality", "speed"]).optional(),
  })
  .passthrough()

export function validateVideoGenerationPayload(payload: unknown) {
  return videoGenerationPayloadSchema.safeParse(payload)
}

export function normalizeVideoGenerationPayload(payload: VideoGenerationRequest): VideoGenerationRequest {
  const normalized: VideoGenerationRequest = {
    ...payload,
    modelId: payload.modelId.trim(),
  }

  if (typeof payload.prompt === "string") {
    normalized.prompt = payload.prompt.trim()
  }

  if (typeof payload.negativePrompt === "string") {
    normalized.negativePrompt = payload.negativePrompt.trim()
  }

  if (typeof payload.aspectRatio === "string") {
    normalized.aspectRatio = payload.aspectRatio.trim()
  }

  if (typeof payload.resolution === "string") {
    normalized.resolution = payload.resolution.toLowerCase()
  }

  return normalized
}

function sanitizeErrorMessage(message: string): string {
  const trimmed = message.trim()
  const scrubbed = trimmed.replace(sensitiveTokenPattern, "[redacted]")

  return scrubbed.length > 0 ? scrubbed : "Video generation request could not be processed"
}

export function mapVideoModelExecutionError(error: unknown): { code: VideoModelExecutionErrorCode; message: string } {
  if (error instanceof Error) {
    return {
      code: "VIDEO_MODEL_EXECUTION_FAILED",
      message: sanitizeErrorMessage(error.message),
    }
  }

  return {
    code: "VIDEO_MODEL_EXECUTION_FAILED",
    message: "Video generation request could not be processed",
  }
}
