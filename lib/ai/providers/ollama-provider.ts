import { createHttpProviderAdapter } from "./http-provider"

export const ollamaProvider = createHttpProviderAdapter({
  id: "ollama",
  models: ["llama3.1", "mistral", "phi3"],
  baseUrlEnv: "OLLAMA_BASE_URL",
  endpointPath: "/api/generate",
})
