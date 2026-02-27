import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const stabilityModelMatcher = /^stability([-.].+)?$/i

export const stabilityVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "stability",
  supportsModel(modelId) {
    return stabilityModelMatcher.test(modelId.trim())
  },
  async execute(request: VideoGenerationRequest) {
    return {
      providerRequest: {
        ...request,
        modelId: request.modelId.trim(),
      },
      progress: {
        jobId: "pending",
        provider: "stability",
        status: "queued",
        progressPercent: 0,
      },
      result: {
        jobId: "pending",
        provider: "stability",
        modelId: request.modelId.trim(),
      },
    }
  },
}
