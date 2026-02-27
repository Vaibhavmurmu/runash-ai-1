import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const stabilityModelMatcher = /^stability([-.].+)?$/i

export const stabilityVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "stability",
  supportsModel(modelId) {
    return stabilityModelMatcher.test(modelId.trim())
  },
  normalizeRequest(request: VideoGenerationRequest): VideoGenerationRequest {
    return {
      ...request,
      modelId: request.modelId.trim(),
    }
  },
}
