import { runwayVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/runway"
import { stabilityVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/stability"
import { wanVideoModelProviderAdapter } from "@/lib/editor/video-models/providers/wan"
import type { VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const modelProviderAdapters: VideoModelProviderAdapter[] = [
  wanVideoModelProviderAdapter,
  runwayVideoModelProviderAdapter,
  stabilityVideoModelProviderAdapter,
]

export function resolveVideoModelProviderAdapter(modelId: string): VideoModelProviderAdapter | null {
  const normalizedModelId = modelId.trim()

  return modelProviderAdapters.find((adapter) => adapter.supportsModel(normalizedModelId)) ?? null
}
