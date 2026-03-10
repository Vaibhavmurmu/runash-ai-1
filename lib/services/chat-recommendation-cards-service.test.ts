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

test("recommendation cards service returns text-only recipe cards", async () => {
  const service = createChatRecommendationCardsService()
  const response = await service.getCards({ intent: "recipe", userInput: "easy sustainable recipe", userPreferences: preferences })

  assert.equal(response.intent, "recipe")
  assert.ok((response.metadata.recipes?.length ?? 0) > 0)
  assert.equal(response.metadata.recipes?.[0]?.image, null)
})

test("recommendation cards service returns products for product intent", async () => {
  const service = createChatRecommendationCardsService()
  const response = await service.getCards({ intent: "product", userInput: "organic vegetables", userPreferences: preferences })

  assert.equal(response.intent, "product")
  assert.ok((response.metadata.products?.length ?? 0) > 0)
})
