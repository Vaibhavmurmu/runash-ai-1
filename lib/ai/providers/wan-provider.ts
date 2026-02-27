import { createHttpProviderAdapter } from "./http-provider"

export const wanProvider = createHttpProviderAdapter({
  id: "wan",
  models: ["wan-chat", "wan-multimodal"],
  baseUrlEnv: "WAN_BASE_URL",
  endpointPath: "/v1/generate",
})
