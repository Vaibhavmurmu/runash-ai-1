import { getRecommendedProducts } from "@/lib/chat-product-recommendations"
import { getRecipeSuggestions } from "@/lib/recipe-suggestions"
import { getSustainabilityTips } from "@/lib/sustainability-tips"
import type {
  ChatRecommendationCardsRequest,
  ChatRecommendationCardsResponse,
  ChatRecommendationIntent,
  ChatRecommendationPayload,
} from "@/types/chat-fallback-cards"

const withTextOnlyRecipeCards = (payload: ChatRecommendationPayload): ChatRecommendationPayload => ({
  ...payload,
  recipes: payload.recipes?.map((recipe) => ({
    ...recipe,
    image: null,
    imageHd: undefined,
    imageThumb: undefined,
    imageAlt: undefined,
  })),
})

const buildPayload = ({
  intent,
  userInput,
  userPreferences,
  limit,
}: ChatRecommendationCardsRequest): ChatRecommendationPayload => {
  const normalizedLimit = Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.min(Math.floor(limit as number), 8) : 4

  if (intent === "product") {
    return {
      products: getRecommendedProducts(userInput, userPreferences, normalizedLimit),
    }
  }

  if (intent === "recipe") {
    return withTextOnlyRecipeCards({
      recipes: getRecipeSuggestions(userInput, userPreferences).slice(0, normalizedLimit),
    })
  }

  if (intent === "tip") {
    return {
      tips: getSustainabilityTips(userInput, userPreferences).slice(0, normalizedLimit),
    }
  }

  return withTextOnlyRecipeCards({
    products: getRecommendedProducts(userInput, userPreferences, normalizedLimit),
    recipes: getRecipeSuggestions(userInput, userPreferences).slice(0, normalizedLimit),
    tips: getSustainabilityTips(userInput, userPreferences).slice(0, normalizedLimit),
  })
}

export const createChatRecommendationCardsService = () => ({
  async getCards(request: ChatRecommendationCardsRequest): Promise<ChatRecommendationCardsResponse> {
    const payload = buildPayload(request)

    return {
      intent: request.intent,
      content:
        request.intent === "product"
          ? "Here are product recommendations matched to your preferences."
          : request.intent === "recipe"
            ? "Here are recipe recommendations matched to your cooking goals."
            : request.intent === "tip"
              ? "Here are sustainability tips you can apply immediately."
              : "Here are recommendations based on your request.",
      metadata: payload,
    }
  },
})

export const chatRecommendationCardsService = createChatRecommendationCardsService()
export const CHAT_RECOMMENDATION_INTENTS: ChatRecommendationIntent[] = ["product", "recipe", "tip", "mixed"]
