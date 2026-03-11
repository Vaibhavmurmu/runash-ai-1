import assert from "node:assert/strict"
import test from "node:test"
import { createChatFallbackResponseService } from "@/lib/services/chat-fallback-response-service"
import type { UserPreferences } from "@/types/runash-chat"

const defaultPreferences: UserPreferences = {
  dietaryRestrictions: [],
  sustainabilityPriority: "medium",
  budgetRange: [0, 200],
  preferredCategories: [],
  cookingSkillLevel: "intermediate",
}

test("fallback service returns recipe cards when provider succeeds", async () => {
  const service = createChatFallbackResponseService({
    getProducts: async () => [],
    getRecipes: async () => [
      {
        id: "recipe-1",
        name: "Lentil Bowl",
        description: "Simple high-protein bowl.",
        difficulty: "easy",
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        ingredients: [{ id: "i1", name: "Lentils", amount: "1", unit: "cup", isOrganic: true }],
        instructions: ["Cook lentils", "Serve warm"],
        image: null,
        tags: ["vegan"],
        sustainabilityScore: 8,
        nutritionalInfo: { calories: 250, protein: 16, carbs: 34, fat: 5, fiber: 12, sugar: 3, sodium: 120 },
      },
    ],
    getTips: async () => [],
  })

  const response = await service.buildResponse("share a meal recipe", defaultPreferences)
  assert.equal(response.type, "recipe")
  assert.equal(response.metadata?.recipes?.[0]?.image, null)
})

test("fallback service degrades to text when provider fails", async () => {
  const service = createChatFallbackResponseService({
    getProducts: async () => {
      throw new Error("provider_down")
    },
    getRecipes: async () => {
      throw new Error("provider_down")
    },
    getTips: async () => {
      throw new Error("provider_down")
    },
  })

  const response = await service.buildResponse("need a recipe", defaultPreferences)
  assert.equal(response.type, "text")
  assert.equal(typeof response.content, "string")
  assert.equal(response.metadata, undefined)
})
