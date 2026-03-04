import { ollamaProvider } from "./providers/ollama-provider"
import { llamaProvider } from "./providers/llama-provider"
import { openAIProvider } from "./providers/openai-provider"
import { wanProvider } from "./providers/wan-provider"
import { openModelsProvider } from "./providers/open-models-provider"
import { customProvider } from "./providers/custom-provider"
import {
  AIProviderError,
  type AIModelCatalogEntry,
  type AIModelSelection,
  type AIProviderAdapter,
  type AIStreamTextResult,
  type AITextGenerationRequest,
  type AITextGenerationResult,
} from "./providers/types"

const PROVIDERS: Record<string, AIProviderAdapter> = {
  openai: openAIProvider,
  ollama: ollamaProvider,
  llama: llamaProvider,
  wan: wanProvider,
  "open-models": openModelsProvider,
  custom: customProvider,
}

export const MODEL_CATALOG: AIModelCatalogEntry[] = [
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o Mini",
    description: "Fast ChatGPT-family model for general responses.",
    capabilities: { text: true, stream: true, multimodal: true },
    costTier: "low",
    limitTags: [{ key: "rpm", value: "high" }, { key: "context", value: "128k" }],
    fallbackProviders: ["open-models", "ollama"],
  },
  {
    id: "gpt-4o",
    provider: "openai",
    label: "GPT-4o",
    description: "High-quality ChatGPT-family model.",
    capabilities: { text: true, stream: true, image: true, multimodal: true },
    costTier: "high",
    limitTags: [{ key: "rpm", value: "medium" }, { key: "context", value: "128k" }],
    fallbackProviders: ["llama", "open-models"],
  },
  {
    id: "llama-3.1-70b-instruct",
    provider: "llama",
    label: "Llama 3.1 70B",
    description: "Hosted/self-hosted Llama mapping.",
    capabilities: { text: true, stream: true },
    costTier: "medium",
    limitTags: [{ key: "deployment", value: "hosted-or-self-hosted" }],
    fallbackProviders: ["ollama"],
  },
  {
    id: "llama3.1",
    provider: "ollama",
    label: "Ollama Llama 3.1",
    description: "Local inference via Ollama.",
    capabilities: { text: true, stream: true },
    costTier: "free",
    limitTags: [{ key: "deployment", value: "local" }],
    fallbackProviders: ["open-models"],
  },
  {
    id: "wan-chat",
    provider: "wan",
    label: "Wan Chat",
    description: "Wan provider chat model.",
    capabilities: { text: true, stream: true, multimodal: true },
    costTier: "medium",
    limitTags: [{ key: "rpm", value: "medium" }],
    fallbackProviders: ["open-models"],
  },
  {
    id: "open-models/neural-chat",
    provider: "open-models",
    label: "Open Models Neural Chat",
    description: "Open model provider optimized for lightweight chat.",
    capabilities: { text: true, stream: true },
    costTier: "low",
    limitTags: [{ key: "context", value: "32k" }],
    fallbackProviders: ["ollama"],
  },
  {
    id: "custom-v0",
    provider: "custom",
    label: "Custom v0",
    description: "RunAsh tuned custom model profile (full).",
    capabilities: { text: true, stream: true, multimodal: true },
    costTier: "medium",
    limitTags: [{ key: "tier", value: "pro" }],
    fallbackProviders: ["openai", "open-models"],
  },
  {
    id: "custom-v0-mini",
    provider: "custom",
    label: "Custom v0 Mini",
    description: "RunAsh tuned custom model profile (fast).",
    capabilities: { text: true, stream: true },
    costTier: "low",
    limitTags: [{ key: "tier", value: "starter" }],
    fallbackProviders: ["openai", "ollama"],
  },
]

export function listModelCatalog() {
  return MODEL_CATALOG
}

export function resolveModelSelection(selectedModel?: string, selectedProvider?: string): AIModelSelection {
  if (selectedModel) {
    const match = MODEL_CATALOG.find((entry) => entry.id === selectedModel)
    if (match) {
      if (selectedProvider && match.provider !== selectedProvider) {
        throw new AIProviderError("Selected provider does not own selected model", "BAD_REQUEST")
      }

      return { provider: match.provider, model: match.id }
    }
  }

  if (selectedProvider) {
    const provider = PROVIDERS[selectedProvider]
    if (!provider) {
      throw new AIProviderError(`Unknown provider: ${selectedProvider}`, "BAD_REQUEST")
    }

    return { provider: selectedProvider, model: provider.models[0] }
  }

  return { provider: "openai", model: "gpt-4o-mini" }
}

function resolveFallbackProviders(primary: AIModelSelection): AIProviderAdapter[] {
  const catalog = MODEL_CATALOG.find((item) => item.id === primary.model && item.provider === primary.provider)
  const fallbackIds = catalog?.fallbackProviders ?? []

  return fallbackIds.map((id) => PROVIDERS[id]).filter((provider): provider is AIProviderAdapter => Boolean(provider))
}

async function withTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await promiseFactory(controller.signal)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError("Provider request timeout", "TIMEOUT")
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function canRetry(error: unknown) {
  return error instanceof AIProviderError && (error.code === "TIMEOUT" || error.code === "QUOTA" || error.code === "UPSTREAM")
}

export async function generateModelTextWithFallback(
  selection: AIModelSelection,
  request: Omit<AITextGenerationRequest, "model">,
): Promise<AITextGenerationResult> {
  const primaryProvider = PROVIDERS[selection.provider]
  if (!primaryProvider) {
    throw new AIProviderError(`Provider ${selection.provider} not found`, "BAD_REQUEST")
  }

  const providers = [primaryProvider, ...resolveFallbackProviders(selection)]
  let lastError: unknown

  for (const provider of providers) {
    const targetModel = provider.supportsModel(selection.model) ? selection.model : provider.models[0]
    try {
      return await withTimeout(
        (signal) => provider.generateText({ ...request, signal, model: targetModel }),
        Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 8000),
      )
    } catch (error) {
      lastError = error
      if (!canRetry(error)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new AIProviderError("All providers failed", "UNKNOWN")
}

export async function streamModelTextWithFallback(
  selection: AIModelSelection,
  request: Omit<AITextGenerationRequest, "model">,
): Promise<AIStreamTextResult> {
  const primaryProvider = PROVIDERS[selection.provider]
  if (!primaryProvider) {
    throw new AIProviderError(`Provider ${selection.provider} not found`, "BAD_REQUEST")
  }

  const providers = [primaryProvider, ...resolveFallbackProviders(selection)]
  let lastError: unknown

  for (const provider of providers) {
    const targetModel = provider.supportsModel(selection.model) ? selection.model : provider.models[0]

    if (!provider.capabilities.stream) {
      lastError = new AIProviderError("Provider does not support streaming for selected model", "UNSUPPORTED_FEATURE")
      continue
    }

    try {
      return await withTimeout(
        (signal) => provider.streamText({ ...request, signal, model: targetModel }),
        Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 8000),
      )
    } catch (error) {
      lastError = error
      if (!canRetry(error)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new AIProviderError("All providers failed", "UNKNOWN")
}

export type {
  AIProviderAdapter,
  AITextGenerationRequest,
  AITextGenerationResult,
  AIStreamTextResult,
  AIModelCatalogEntry,
} from "./providers/types"
export { AIProviderError } from "./providers/types"
