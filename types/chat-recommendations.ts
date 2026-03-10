import type { Product, Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export type ChatRecommendationIntent = "product" | "recipe" | "tip" | "mixed"
export type ChatFallbackMessageType = "text" | "product" | "recipe" | "tip"

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

export interface ChatFallbackResponse {
  content: string
  type: ChatFallbackMessageType
  metadata?: ChatRecommendationPayload
}

export interface RecommendationProviderRequest {
  userInput: string
  userPreferences: UserPreferences
  limit?: number
}

export interface RecommendationProviderResponse<T> {
  data: T[]
}
