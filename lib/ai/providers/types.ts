export type AIMessage = {
  role: string
  content: string
}

export type AICapabilities = {
  text: boolean
  stream: boolean
  image?: boolean
  multimodal?: boolean
}

export type AICostTier = "free" | "low" | "medium" | "high"

export type AILimitTag = {
  key: string
  value: string
}

export type AIModelCatalogEntry = {
  id: string
  provider: string
  label: string
  description: string
  capabilities: AICapabilities
  costTier: AICostTier
  limitTags: AILimitTag[]
  fallbackProviders?: string[]
}

export type AIModelSelection = {
  provider: string
  model: string
}

export type AITextGenerationRequest = {
  model: string
  messages: AIMessage[]
  system?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export type AITextGenerationResult = {
  text: string
  provider: string
  model: string
}

export type AIStreamTextResult = {
  provider: string
  model: string
  textStream: AsyncIterable<string>
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "TIMEOUT" | "QUOTA" | "UNSUPPORTED_FEATURE" | "BAD_REQUEST" | "UPSTREAM" | "UNKNOWN",
  ) {
    super(message)
    this.name = "AIProviderError"
  }
}

export interface AIProviderAdapter {
  readonly id: string
  readonly models: string[]
  readonly capabilities: AICapabilities
  supportsModel(model: string): boolean
  generateText(request: AITextGenerationRequest): Promise<AITextGenerationResult>
  streamText(request: AITextGenerationRequest): Promise<AIStreamTextResult>
  generateImage?: (prompt: string, signal?: AbortSignal) => Promise<{ provider: string; model: string; url?: string }>
}
