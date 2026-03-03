import { z } from "zod"

export const feedbackSubmitSchema = z.object({
  score: z.number().int().min(1).max(5),
  message: z.string().trim().min(5).max(1000),
  source: z.string().trim().min(2).max(50).optional().default("dashboard"),
})

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>
