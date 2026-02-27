import { createHttpProviderAdapter } from "./http-provider"

export const openModelsProvider = createHttpProviderAdapter({
  id: "open-models",
  models: ["open-models/neural-chat", "open-models/coder"],
  baseUrlEnv: "OPEN_MODELS_BASE_URL",
  endpointPath: "/v1/generate",
})
