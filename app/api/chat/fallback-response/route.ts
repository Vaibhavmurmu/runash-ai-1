import { type NextRequest } from "next/server"
import { z } from "zod"
import { chatFallbackResponseService } from "@/lib/services/chat-fallback-response-service"

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

const fallbackRequestSchema = z.object({
  userInput: z.string().trim().min(1),
  userPreferences: userPreferencesSchema,
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = fallbackRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: "Invalid fallback request" }, { status: 400 })
  }

  const response = await chatFallbackResponseService.buildResponse(parsed.data.userInput, parsed.data.userPreferences)
  return Response.json(response, { status: 200 })
}
