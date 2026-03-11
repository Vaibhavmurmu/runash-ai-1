import { chatRecommendationProviderService } from "@/lib/services/chat-recommendation-provider-service"
import type {
  ChatRecommendationCardsRequest,
  ChatRecommendationCardsResponse,
  ChatRecommendationIntent,
  ChatRecommendationPayload,
} from "@/types/chat-recommendations"
import type { Product, Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export interface ChatRecommendationCardsProviders {
  getProducts: (input: string, preferences: UserPreferences, limit?: number) => Promise<Product[]>
  getRecipes: (input: string, preferences: UserPreferences, limit?: number) => Promise<Recipe[]>
  getTips: (input: string, preferences: UserPreferences, limit?: number) => Promise<SustainabilityTip[]>
}

const defaultProviders: ChatRecommendationCardsProviders = {
  async getProducts(input, preferences, limit) {
    const payload = await chatRecommendationProviderService.getProducts({ userInput: input, userPreferences: preferences, limit })
    return payload.data
  },
  async getRecipes(input, preferences, limit) {
    const payload = await chatRecommendationProviderService.getRecipes({ userInput: input, userPreferences: preferences, limit })
    return payload.data
  },
  async getTips(input, preferences, limit) {
    const payload = await chatRecommendationProviderService.getTips({ userInput: input, userPreferences: preferences, limit })
    return payload.data
  },
}

const normalizeLimit = (limit?: number) => (Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.min(Math.floor(limit as number), 8) : 4)

const getContentByIntent = (intent: ChatRecommendationIntent) =>
  intent === "product"
    ? "Here are product recommendations matched to your preferences."
    : intent === "recipe"
      ? "Here are recipe recommendations matched to your cooking goals."
      : intent === "tip"
        ? "Here are sustainability tips you can apply immediately."
        : "Here are recommendations based on your request."

export const createChatRecommendationCardsService = (providers: ChatRecommendationCardsProviders = defaultProviders) => ({
  async getCards(request: ChatRecommendationCardsRequest): Promise<ChatRecommendationCardsResponse> {
    const limit = normalizeLimit(request.limit)

    try {
      const metadata: ChatRecommendationPayload =
        request.intent === "product"
          ? { products: await providers.getProducts(request.userInput, request.userPreferences, limit) }
          : request.intent === "recipe"
            ? { recipes: await providers.getRecipes(request.userInput, request.userPreferences, limit) }
            : request.intent === "tip"
              ? { tips: await providers.getTips(request.userInput, request.userPreferences, limit) }
              : {
                  products: await providers.getProducts(request.userInput, request.userPreferences, limit),
                  recipes: await providers.getRecipes(request.userInput, request.userPreferences, limit),
                  tips: await providers.getTips(request.userInput, request.userPreferences, limit),
                }

      return { intent: request.intent, content: getContentByIntent(request.intent), metadata }
    } catch {
      return {
        intent: request.intent,
        content: "Recommendations are temporarily unavailable. Share your goal and I can help with a quick text plan.",
        metadata: {},
      }
    }
  },
})

export const chatRecommendationCardsService = createChatRecommendationCardsService()
export const CHAT_RECOMMENDATION_INTENTS: ChatRecommendationIntent[] = ["product", "recipe", "tip", "mixed"]
