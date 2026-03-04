import { createHttpProviderAdapter } from "./http-provider"

export const llamaProvider = createHttpProviderAdapter({
  id: "llama",
  models: ["llama-3.1-70b-instruct", "llama-3.1-8b-instruct", "llama-self-hosted"],
  baseUrlEnv: "LLAMA_BASE_URL",
  endpointPath: "/v1/chat/completions",
})
