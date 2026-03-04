import { createHttpProviderAdapter } from "./http-provider"

export const customProvider = createHttpProviderAdapter({
  id: "custom",
  models: ["custom-v0", "custom-v0-mini"],
  baseUrlEnv: "CUSTOM_MODEL_BASE_URL",
  endpointPath: "/v1/generate",
})
