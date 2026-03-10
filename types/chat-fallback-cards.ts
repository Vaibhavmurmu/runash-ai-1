import type { Product, Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export type ChatFallbackMessageType = "text" | "product" | "recipe" | "tip"

export interface ChatFallbackRequest {
  userInput: string
  userPreferences: UserPreferences
}

export interface ChatFallbackMetadata {
  products?: Product[]
  recipes?: Recipe[]
  tips?: SustainabilityTip[]
}

export interface ChatFallbackResponse {
  content: string
  type: ChatFallbackMessageType
  metadata?: ChatFallbackMetadata
}
