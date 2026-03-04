import {
  AIProviderError,
  type AIProviderAdapter,
  type AIStreamTextResult,
  type AITextGenerationRequest,
  type AITextGenerationResult,
} from "./types"

type HttpProviderConfig = {
  id: string
  models: string[]
  baseUrlEnv: string
  endpointPath: string
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return response.json()
  }

  return { text: await response.text() }
}

function toProviderError(response: Response, payload: unknown): AIProviderError {
  if (response.status === 402 || response.status === 429) {
    return new AIProviderError("Provider quota exceeded", "QUOTA")
  }

  if (response.status >= 400 && response.status < 500) {
    return new AIProviderError(`Invalid request for provider (${response.status})`, "BAD_REQUEST")
  }

  return new AIProviderError(`Provider returned ${response.status}: ${JSON.stringify(payload)}`, "UPSTREAM")
}

export function createHttpProviderAdapter(config: HttpProviderConfig): AIProviderAdapter {
  const baseUrl = process.env[config.baseUrlEnv]

  const generateText = async (request: AITextGenerationRequest): Promise<AITextGenerationResult> => {
    if (!baseUrl) {
      throw new AIProviderError(`Provider ${config.id} is not configured`, "UNSUPPORTED_FEATURE")
    }

    const response = await fetch(`${baseUrl}${config.endpointPath}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: request.signal,
      body: JSON.stringify({
        model: request.model,
        system: request.system,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }),
    })

    const payload = await parseJsonResponse(response)

    if (!response.ok) {
      throw toProviderError(response, payload)
    }

    const text =
      typeof payload === "object" && payload !== null && "text" in payload && typeof payload.text === "string"
        ? payload.text
        : JSON.stringify(payload)

    return {
      text,
      provider: config.id,
      model: request.model,
    }
  }

  const streamText = async (request: AITextGenerationRequest): Promise<AIStreamTextResult> => {
    const generated = await generateText(request)

    return {
      provider: generated.provider,
      model: generated.model,
      textStream: (async function* () {
        yield generated.text
      })(),
    }
  }

  return {
    id: config.id,
    models: config.models,
    capabilities: { text: true, stream: true },
    supportsModel: (model) => config.models.includes(model),
    generateText,
    streamText,
  }
}
