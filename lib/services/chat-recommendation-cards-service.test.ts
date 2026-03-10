import assert from "node:assert/strict"
import test from "node:test"
import { createChatRecommendationCardsService } from "@/lib/services/chat-recommendation-cards-service"
import type { UserPreferences } from "@/types/runash-chat"

const preferences: UserPreferences = {
  dietaryRestrictions: [],
  sustainabilityPriority: "high",
  budgetRange: [0, 300],
  preferredCategories: ["fruits-vegetables"],
  cookingSkillLevel: "beginner",
}

test("recommendation cards service returns provider-backed recipe cards", async () => {
  const service = createChatRecommendationCardsService({
    getProducts: async () => [],
    getRecipes: async () => [
      {
        id: "recipe-provider-1",
        name: "Provider Recipe",
        description: "From provider",
        difficulty: "easy",
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        ingredients: [],
        instructions: ["step"],
        image: "https://picsum.photos/seed/provider-recipe/960/540",
        tags: ["easy"],
        sustainabilityScore: 9,
        nutritionalInfo: { calories: 100, protein: 10, carbs: 12, fat: 3, fiber: 4, sugar: 1, sodium: 50 },
      },
    ],
    getTips: async () => [],
  })

  const response = await service.getCards({ intent: "recipe", userInput: "easy sustainable recipe", userPreferences: preferences })

  assert.equal(response.intent, "recipe")
  assert.equal(response.metadata.recipes?.[0]?.image?.startsWith("https://"), true)
})

test("recommendation cards service falls back to text-only metadata when provider fails", async () => {
  const service = createChatRecommendationCardsService({
    getProducts: async () => {
      throw new Error("provider_down")
    },
    getRecipes: async () => [],
    getTips: async () => [],
  })

  const response = await service.getCards({ intent: "product", userInput: "organic vegetables", userPreferences: preferences })

  assert.equal(response.intent, "product")
  assert.equal(response.content.includes("temporarily unavailable"), true)
  assert.deepEqual(response.metadata, {})
})
