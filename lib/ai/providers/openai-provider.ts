import { openai } from "@ai-sdk/openai"
import { generateText as sdkGenerateText, streamText as sdkStreamText } from "ai"
import {
  AIProviderError,
  type AIProviderAdapter,
  type AIStreamTextResult,
  type AITextGenerationRequest,
  type AITextGenerationResult,
} from "./types"

const OPENAI_MODEL_ALIASES: Record<string, string> = {
  "custom-v0": "gpt-4o",
  "custom-v0-mini": "gpt-4o-mini",
}

function resolveOpenAIModel(model: string) {
  return OPENAI_MODEL_ALIASES[model] ?? model
}

export const openAIProvider: AIProviderAdapter = {
  id: "openai",
  models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "custom-v0", "custom-v0-mini"],
  capabilities: { text: true, stream: true, image: true, multimodal: true },
  supportsModel: (model) => Object.keys(OPENAI_MODEL_ALIASES).includes(model) || ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"].includes(model),
  async generateText(request: AITextGenerationRequest): Promise<AITextGenerationResult> {
    try {
      const result = await sdkGenerateText({
        model: openai(resolveOpenAIModel(request.model)),
        system: request.system,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        abortSignal: request.signal,
      })

      return {
        text: result.text,
        provider: "openai",
        model: request.model,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ""
      if (message.includes("quota") || message.includes("rate limit")) {
        throw new AIProviderError("OpenAI quota exceeded", "QUOTA")
      }
      throw new AIProviderError("OpenAI request failed", "UPSTREAM")
    }
  },
  async streamText(request: AITextGenerationRequest): Promise<AIStreamTextResult> {
    try {
      const result = sdkStreamText({
        model: openai(resolveOpenAIModel(request.model)),
        system: request.system,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        abortSignal: request.signal,
      })

      return {
        provider: "openai",
        model: request.model,
        textStream: result.textStream,
      }
    } catch {
      throw new AIProviderError("OpenAI stream failed", "UPSTREAM")
    }
  },
}
