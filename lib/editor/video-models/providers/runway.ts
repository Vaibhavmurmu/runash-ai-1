import type { VideoGenerationRequest, VideoModelProviderAdapter } from "@/lib/editor/video-models/types"

const runwayModelMatcher = /^runway([-.].+)?$/i

export const runwayVideoModelProviderAdapter: VideoModelProviderAdapter = {
  provider: "runway",
  supportsModel(modelId) {
    return runwayModelMatcher.test(modelId.trim())
  },
  async execute(request: VideoGenerationRequest) {
    return {
      providerRequest: {
        ...request,
        modelId: request.modelId.trim(),
      },
      progress: {
        jobId: "pending",
        provider: "runway",
        status: "queued",
        progressPercent: 0,
      },
      result: {
        jobId: "pending",
        provider: "runway",
        modelId: request.modelId.trim(),
      },
    }
  },
}
