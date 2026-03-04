import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const wanModelMatcher = /^wan([-.].+)?$/i

export const wanVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "wan",
  supportsModel(modelId) {
    return wanModelMatcher.test(modelId.trim())
  },
  async execute(request: VideoGenerationRequest) {
    return {
      providerRequest: {
        ...request,
        modelId: request.modelId.trim(),
      },
      progress: {
        jobId: "pending",
        provider: "wan",
        status: "queued",
        progressPercent: 0,
      },
      result: {
        jobId: "pending",
        provider: "wan",
        modelId: request.modelId.trim(),
      },
    }
  },
}
