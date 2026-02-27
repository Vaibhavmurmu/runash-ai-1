import { z } from "zod"
import type { VideoGenerationRequest } from "@/lib/editor/video-models/types"

const resolutionPattern = /^(?<width>\d{2,5})x(?<height>\d{2,5})$/i
const aspectRatioPattern = /^\d{1,2}:\d{1,2}$/

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
