import { runwayVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/runway"
import { stabilityVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/stability"
import { wanVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/wan"
import type { GenerationQualityMode, VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

export interface VideoModelRegistryMetadata {
  id: string
  name: string
  description: string
  tier: "Free" | "Pro" | "Enterprise"
  defaultConfig: {
    prompt: string
    negativePrompt: string
    aspectRatio: string
    resolution: string
    fps: number
    durationPreset: string
    durationSeconds: number
    seed: number
    qualityMode: GenerationQualityMode
  }
  supportedAspectRatios: string[]
  supportedResolutions: string[]
  durationPresetOptions: Array<{ id: string; label: string; seconds: number }>
  fpsRange: {
    min: number
    max: number
  }
}

const modelProviderAdapters: VideoModelProviderAdapter[] = [
  wanVideoModelProviderAdapter,
  runwayVideoModelProviderAdapter,
  stabilityVideoModelProviderAdapter,
]

export const VIDEO_MODEL_REGISTRY: VideoModelRegistryMetadata[] = [
  {
    id: "wan-2.1",
    name: "WAN 2.1",
    description: "Balanced quality model with broad prompt fidelity.",
    tier: "Pro",
    defaultConfig: {
      prompt: "A cinematic scene with smooth camera motion and realistic lighting",
      negativePrompt: "blurry, low-detail, artifacts",
      aspectRatio: "16:9",
      resolution: "1920x1080",
      fps: 30,
      durationPreset: "15s",
      durationSeconds: 15,
      seed: 42,
      qualityMode: "quality",
    },
    supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    supportedResolutions: ["1920x1080", "1280x720", "1080x1920"],
    durationPresetOptions: [
      { id: "5s", label: "5 seconds", seconds: 5 },
      { id: "10s", label: "10 seconds", seconds: 10 },
      { id: "15s", label: "15 seconds", seconds: 15 },
      { id: "30s", label: "30 seconds", seconds: 30 },
    ],
    fpsRange: { min: 12, max: 60 },
  },
  {
    id: "runway-gen3",
    name: "Runway Gen-3",
    description: "Fast iteration model suitable for preview renders.",
    tier: "Pro",
    defaultConfig: {
      prompt: "A clean product demo shot with subtle dolly movement",
      negativePrompt: "noise, flicker, warped hands",
      aspectRatio: "16:9",
      resolution: "1280x720",
      fps: 24,
      durationPreset: "10s",
      durationSeconds: 10,
      seed: 7,
      qualityMode: "speed",
    },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportedResolutions: ["1280x720", "1920x1080", "720x1280"],
    durationPresetOptions: [
      { id: "5s", label: "5 seconds", seconds: 5 },
      { id: "10s", label: "10 seconds", seconds: 10 },
      { id: "20s", label: "20 seconds", seconds: 20 },
    ],
    fpsRange: { min: 12, max: 30 },
  },
  {
    id: "stability-video",
    name: "Stability Video",
    description: "Efficient high-throughput model tuned for consistency.",
    tier: "Pro",
    defaultConfig: {
      prompt: "A vibrant motion graphic sequence with smooth transitions",
      negativePrompt: "distorted faces, jitter, text glitches",
      aspectRatio: "1:1",
      resolution: "1024x1024",
      fps: 24,
      durationPreset: "8s",
      durationSeconds: 8,
      seed: 101,
      qualityMode: "quality",
    },
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    supportedResolutions: ["1024x1024", "1280x720", "720x1280"],
    durationPresetOptions: [
      { id: "4s", label: "4 seconds", seconds: 4 },
      { id: "8s", label: "8 seconds", seconds: 8 },
      { id: "12s", label: "12 seconds", seconds: 12 },
    ],
    fpsRange: { min: 12, max: 30 },
  },
]

const fallbackModel = VIDEO_MODEL_REGISTRY[0]

export function resolveVideoModelProviderAdapter(modelId: string): VideoModelProviderAdapter | null {
  const normalizedModelId = modelId.trim()

  return modelProviderAdapters.find((adapter) => adapter.supportsModel(normalizedModelId)) ?? null
}

export function getVideoModelMetadata(modelId: string): VideoModelRegistryMetadata {
  return VIDEO_MODEL_REGISTRY.find((entry) => entry.id === modelId) ?? fallbackModel
}

export function buildGenerationDefaults(modelId: string): VideoGenerationRequest {
  const model = getVideoModelMetadata(modelId)

  return {
    modelId,
    ...model.defaultConfig,
  }
}

export function validateGenerationConfig(modelId: string, config: VideoGenerationRequest): Record<string, string> {
  const model = getVideoModelMetadata(modelId)
  const errors: Record<string, string> = {}

  if (!config.prompt || typeof config.prompt !== "string" || config.prompt.trim().length === 0) {
    errors.prompt = "Prompt is required"
  }

  const fps = Number(config.fps)
  if (!Number.isFinite(fps) || fps < model.fpsRange.min || fps > model.fpsRange.max) {
    errors.fps = `FPS must be between ${model.fpsRange.min} and ${model.fpsRange.max}`
  }

  if (typeof config.resolution !== "string" || !model.supportedResolutions.includes(config.resolution)) {
    errors.resolution = "Choose a supported resolution"
  }

  if (typeof config.aspectRatio !== "string" || !model.supportedAspectRatios.includes(config.aspectRatio)) {
    errors.aspectRatio = "Choose a supported aspect ratio"
  }

  const preset = model.durationPresetOptions.find((item) => item.id === config.durationPreset)
  if (!preset) {
    errors.durationPreset = "Choose a valid duration preset"
  }

  const seed = Number(config.seed)
  if (!Number.isInteger(seed) || seed < 0) {
    errors.seed = "Seed must be a non-negative integer"
  }

  if (config.qualityMode !== "quality" && config.qualityMode !== "speed") {
    errors.qualityMode = "Choose quality or speed mode"
  }

  return errors
}
