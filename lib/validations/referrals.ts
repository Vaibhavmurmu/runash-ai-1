import { z } from "zod"

export const referralInviteSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
})

export const referralConversionSchema = z.object({
  inviteCode: z.string().trim().min(8).max(64),
  conversionSource: z.string().trim().min(2).max(50).optional().default("manual"),
})

export type ReferralInviteInput = z.infer<typeof referralInviteSchema>
export type ReferralConversionInput = z.infer<typeof referralConversionSchema>
