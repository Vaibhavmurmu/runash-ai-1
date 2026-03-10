import type { Product, Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export type ChatFallbackMessageType = "text" | "product" | "recipe" | "tip"
export type ChatRecommendationIntent = "product" | "recipe" | "tip" | "mixed"

export interface ChatRecommendationPayload {
  products?: Product[]
  recipes?: Recipe[]
  tips?: SustainabilityTip[]
}

export interface ChatRecommendationCardsRequest {
  intent: ChatRecommendationIntent
  userInput: string
  userPreferences: UserPreferences
  limit?: number
}

export interface ChatRecommendationCardsResponse {
  intent: ChatRecommendationIntent
  content: string
  metadata: ChatRecommendationPayload
}

export interface ChatFallbackRequest {
  userInput: string
  userPreferences: UserPreferences
}

export type ChatFallbackMetadata = ChatRecommendationPayload

export interface ChatFallbackResponse {
  content: string
  type: ChatFallbackMessageType
  metadata?: ChatFallbackMetadata
}
