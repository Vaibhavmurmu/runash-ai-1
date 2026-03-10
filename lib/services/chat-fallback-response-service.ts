import { getRecommendedProducts, shouldRecommendProducts } from "@/lib/chat-product-recommendations"
import type { ChatFallbackResponse } from "@/types/chat-fallback-cards"
import type { Recipe, SustainabilityTip, UserPreferences } from "@/types/runash-chat"

export interface ChatFallbackProviders {
  getRecipes: (preferences: UserPreferences) => Promise<Recipe[]>
  getTips: () => Promise<SustainabilityTip[]>
}

const defaultProviders: ChatFallbackProviders = {
  async getRecipes() {
    return [
      {
        id: "quinoa-bowl",
        name: "Organic Quinoa Buddha Bowl",
        description: "A nutritious bowl with quinoa, greens, chickpeas, and tahini dressing.",
        difficulty: "easy",
        prepTime: 15,
        cookTime: 20,
        servings: 2,
        ingredients: [
          { id: "q1", name: "Organic quinoa", amount: "1", unit: "cup", isOrganic: true },
          { id: "q2", name: "Organic kale", amount: "2", unit: "cups", isOrganic: true },
          { id: "q3", name: "Organic chickpeas", amount: "1", unit: "can", isOrganic: true },
        ],
        instructions: [
          "Cook quinoa according to package instructions.",
          "Massage kale with olive oil and lemon juice.",
          "Combine kale, quinoa, and chickpeas. Add tahini dressing.",
        ],
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80",
        tags: ["vegan", "high-protein"],
        sustainabilityScore: 9,
        nutritionalInfo: { calories: 420, protein: 18, carbs: 65, fat: 12, fiber: 12, sugar: 8, sodium: 380 },
      },
    ]
  },
  async getTips() {
    return [
      {
        id: "buy-local-seasonal",
        title: "Buy Local and Seasonal",
        description: "Choose local seasonal produce to reduce transport emissions and support nearby farmers.",
        category: "food",
        impact: "high",
        difficulty: "easy",
        estimatedSavings: 25,
      },
      {
        id: "reduce-food-waste",
        title: "Reduce Food Waste",
        description: "Plan meals, use leftovers creatively, and compost scraps when possible.",
        category: "waste",
        impact: "high",
        difficulty: "medium",
        estimatedSavings: 40,
      },
    ]
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
        const products = getRecommendedProducts(input, userPreferences)
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
        const recipes = await providers.getRecipes(userPreferences)
        if (recipes.length > 0) {
          return {
            content: "Here are sustainable recipes aligned with your cooking preferences:",
            type: "recipe",
            metadata: { recipes },
          }
        }
      }

      if (isTipIntent(input)) {
        const tips = await providers.getTips()
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
