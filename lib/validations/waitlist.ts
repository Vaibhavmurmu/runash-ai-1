import { z } from "zod"

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || undefined)
    .optional()

export const waitlistJoinSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255).transform((value) => value.toLowerCase()),
  name: optionalTrimmedString(100),
  useCase: optionalTrimmedString(500),
})

export type WaitlistJoinInput = z.infer<typeof waitlistJoinSchema>
