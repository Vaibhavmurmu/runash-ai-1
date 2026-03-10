import { shouldRecommendProducts } from "@/lib/chat-product-recommendations"
import { chatRecommendationCardsService } from "@/lib/services/chat-recommendation-cards-service"
import type { ChatFallbackResponse } from "@/types/chat-fallback-cards"
import type { Product, Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export interface ChatFallbackProviders {
  getProducts: (input: string, preferences: UserPreferences) => Promise<Product[]>
  getRecipes: (input: string, preferences: UserPreferences) => Promise<Recipe[]>
  getTips: (input: string, preferences: UserPreferences) => Promise<SustainabilityTip[]>
}

const defaultProviders: ChatFallbackProviders = {
  async getProducts(input, preferences) {
    const response = await chatRecommendationCardsService.getCards({ intent: "product", userInput: input, userPreferences: preferences })
    return response.metadata.products ?? []
  },
  async getRecipes(input, preferences) {
    const response = await chatRecommendationCardsService.getCards({ intent: "recipe", userInput: input, userPreferences: preferences })
    return response.metadata.recipes ?? []
  },
  async getTips(input, preferences) {
    const response = await chatRecommendationCardsService.getCards({ intent: "tip", userInput: input, userPreferences: preferences })
    return response.metadata.tips ?? []
  },
}

const isRecipeIntent = (input: string) => input.includes("recipe") || input.includes("cook") || input.includes("meal")
const isTipIntent = (input: string) =>
  input.includes("sustainable") || input.includes("eco") || input.includes("environment") || input.includes("carbon")

export const createChatFallbackResponseService = (providers: ChatFallbackProviders = defaultProviders) => ({
  async buildResponse(userInput: string, userPreferences: UserPreferences): Promise<ChatFallbackResponse> {
    const input = userInput.toLowerCase()

    try {
      if (shouldRecommendProducts(input)) {
        const products = await providers.getProducts(input, userPreferences)
        const hasProducts = products.length > 0
        return {
          content: hasProducts
            ? `Here are ${products.length} grocery products matched to your budget and preferences:`
            : "I couldn't find products matching all filters, but I can broaden the criteria if you'd like.",
          type: "product",
          metadata: { products },
        }
      }

      if (isRecipeIntent(input)) {
        const recipes = await providers.getRecipes(input, userPreferences)
        if (recipes.length > 0) {
          return {
            content: "Here are sustainable recipes aligned with your cooking preferences:",
            type: "recipe",
            metadata: { recipes },
          }
        }
      }

      if (isTipIntent(input)) {
        const tips = await providers.getTips(input, userPreferences)
        if (tips.length > 0) {
          return {
            content: "Here are sustainability tips to reduce your environmental impact:",
            type: "tip",
            metadata: { tips },
          }
        }
      }
    } catch {
      return {
        content: "I'm having trouble loading recommendations right now. Tell me your goal and I'll help with a quick plan.",
        type: "text",
      }
    }

    return {
      content:
        "I can help with organic products, sustainable living tips, eco-friendly recipes, and retailing automation. What should we focus on?",
      type: "text",
    }
  },
})

export const chatFallbackResponseService = createChatFallbackResponseService()
