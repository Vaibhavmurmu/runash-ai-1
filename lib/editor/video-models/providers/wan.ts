import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const wanModelMatcher = /^wan([-.].+)?$/i

export const wanVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "wan",
  supportsModel(modelId) {
    return wanModelMatcher.test(modelId.trim())
  },
  normalizeRequest(request: VideoGenerationRequest): VideoGenerationRequest {
    return {
      ...request,
      modelId: request.modelId.trim(),
    }
  },
}
