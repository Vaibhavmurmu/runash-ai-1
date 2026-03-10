import { z } from "zod"

export const userPreferencesSchema = z.object({
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

export const recommendationProviderRequestSchema = z.object({
  userInput: z.string().trim().min(1),
  userPreferences: userPreferencesSchema,
  limit: z.number().int().positive().max(8).optional(),
})
