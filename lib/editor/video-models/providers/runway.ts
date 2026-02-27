import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const runwayModelMatcher = /^runway([-.].+)?$/i

export const runwayVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "runway",
  supportsModel(modelId) {
    return runwayModelMatcher.test(modelId.trim())
  },
  normalizeRequest(request: VideoGenerationRequest): VideoGenerationRequest {
    return {
      ...request,
      modelId: request.modelId.trim(),
    }
  },
}
