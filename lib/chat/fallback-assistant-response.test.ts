import assert from "node:assert/strict"
import test from "node:test"
import { buildFallbackAssistantResponse } from "@/lib/chat/fallback-assistant-response"
import type { UserPreferences } from "@/types/runash-chat"

const preferences: UserPreferences = {
  dietaryRestrictions: [],
  sustainabilityPriority: "medium",
  budgetRange: [0, 100],
  preferredCategories: [],
  cookingSkillLevel: "intermediate",
}

test("client fallback helper uses API payload and preserves empty-media metadata", async () => {
  const message = await buildFallbackAssistantResponse(
    "recipe help",
    preferences,
    (async () =>
      new Response(
        JSON.stringify({
          content: "Recipes from API",
          type: "recipe",
          metadata: { recipes: [{ id: "r", name: "R", image: null }] },
        }),
        { status: 200 },
      )) as typeof fetch,
  )

  assert.equal(message.type, "recipe")
  assert.equal(message.metadata?.recipes?.[0]?.image, null)
})

test("client fallback helper returns minimal text when API fails", async () => {
  const message = await buildFallbackAssistantResponse(
    "recipe help",
    preferences,
    (async () => new Response("error", { status: 500 })) as typeof fetch,
  )

  assert.equal(message.type, "text")
  assert.equal(message.metadata, undefined)
})
