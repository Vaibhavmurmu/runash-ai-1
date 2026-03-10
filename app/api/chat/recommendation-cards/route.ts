import { type NextRequest } from "next/server"
import { z } from "zod"
import { chatRecommendationCardsService, CHAT_RECOMMENDATION_INTENTS } from "@/lib/services/chat-recommendation-cards-service"

const userPreferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()),
  sustainabilityPriority: z.enum(["low", "medium", "high"]),
  budgetRange: z.tuple([z.number(), z.number()]),
  preferredCategories: z.array(
    z.enum([
      "fruits-vegetables",
      "grains-cereals",
      "dairy-alternatives",
      "meat-alternatives",
      "pantry-staples",
      "beverages",
      "snacks",
      "personal-care",
      "household",
      "supplements",
    ]),
  ),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  businessType: z.enum(["retail", "restaurant", "farm", "distributor"]).optional(),
})

const recommendationCardsRequestSchema = z.object({
  intent: z.enum(CHAT_RECOMMENDATION_INTENTS as [string, ...string[]]),
  userInput: z.string().trim().min(1),
  userPreferences: userPreferencesSchema,
  limit: z.number().int().positive().max(8).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = recommendationCardsRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: "Invalid recommendation cards request" }, { status: 400 })
  }

  const response = await chatRecommendationCardsService.getCards(parsed.data)
  return Response.json(response, { status: 200 })
}
