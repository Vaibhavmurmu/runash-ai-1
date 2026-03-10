import { getRecommendedProducts } from "@/lib/chat-product-recommendations"
import { getRecipeSuggestions } from "@/lib/recipe-suggestions"
import { getSustainabilityTips } from "@/lib/sustainability-tips"
import type {
  RecommendationProviderRequest,
  RecommendationProviderResponse,
} from "@/types/chat-recommendations"
import type { Product, Recipe, SustainabilityTip } from "@/types/runash-chat"

const RECIPE_MEDIA_BY_ID: Record<string, { image: string; imageHd: string; imageThumb: string; imageAlt: string }> = {
  "recipe-1": {
    image: "https://picsum.photos/seed/runash-recipe-1/960/540",
    imageHd: "https://picsum.photos/seed/runash-recipe-1-hd/1280/720",
    imageThumb: "https://picsum.photos/seed/runash-recipe-1-thumb/480/270",
    imageAlt: "Quinoa veggie power bowl",
  },
  "recipe-2": {
    image: "https://picsum.photos/seed/runash-recipe-2/960/540",
    imageHd: "https://picsum.photos/seed/runash-recipe-2-hd/1280/720",
    imageThumb: "https://picsum.photos/seed/runash-recipe-2-thumb/480/270",
    imageAlt: "Overnight oats with berries",
  },
  "recipe-3": {
    image: "https://picsum.photos/seed/runash-recipe-3/960/540",
    imageHd: "https://picsum.photos/seed/runash-recipe-3-hd/1280/720",
    imageThumb: "https://picsum.photos/seed/runash-recipe-3-thumb/480/270",
    imageAlt: "Lentil tomato soup",
  },
}

const withRecipeMedia = (recipe: Recipe): Recipe => {
  const media = RECIPE_MEDIA_BY_ID[recipe.id]
  if (!media) return recipe

  return {
    ...recipe,
    image: media.image,
    imageHd: media.imageHd,
    imageThumb: media.imageThumb,
    imageAlt: media.imageAlt,
  }
}

export const createChatRecommendationProviderService = () => ({
  async getProducts(request: RecommendationProviderRequest): Promise<RecommendationProviderResponse<Product>> {
    const normalizedLimit = Number.isFinite(request.limit) && (request.limit ?? 0) > 0 ? Math.min(Math.floor(request.limit as number), 8) : 4
    return { data: getRecommendedProducts(request.userInput, request.userPreferences, normalizedLimit) }
  },

  async getRecipes(request: RecommendationProviderRequest): Promise<RecommendationProviderResponse<Recipe>> {
    const normalizedLimit = Number.isFinite(request.limit) && (request.limit ?? 0) > 0 ? Math.min(Math.floor(request.limit as number), 8) : 4
    return { data: getRecipeSuggestions(request.userInput, request.userPreferences).slice(0, normalizedLimit).map(withRecipeMedia) }
  },

  async getTips(request: RecommendationProviderRequest): Promise<RecommendationProviderResponse<SustainabilityTip>> {
    const normalizedLimit = Number.isFinite(request.limit) && (request.limit ?? 0) > 0 ? Math.min(Math.floor(request.limit as number), 8) : 4
    return { data: getSustainabilityTips(request.userInput, request.userPreferences).slice(0, normalizedLimit) }
  },
})

export const chatRecommendationProviderService = createChatRecommendationProviderService()
