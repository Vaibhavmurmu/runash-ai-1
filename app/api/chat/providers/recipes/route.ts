import { type NextRequest } from "next/server"
import { chatRecommendationProviderService } from "@/lib/services/chat-recommendation-provider-service"
import { recommendationProviderRequestSchema } from "@/app/api/chat/providers/_schemas"
import type { RecommendationProviderResponse } from "@/types/chat-recommendations"
import type { Recipe } from "@/types/runash-chat"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = recommendationProviderRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: "Invalid recipe provider request" }, { status: 400 })
  }

  const response: RecommendationProviderResponse<Recipe> = await chatRecommendationProviderService.getRecipes(parsed.data)
  return Response.json(response, { status: 200 })
}
