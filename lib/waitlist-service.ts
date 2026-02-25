import { EmailSafetyPolicyError, sendWaitlistConfirmationEmail } from "@/lib/email"
import { createWaitlistEntry, findWaitlistEntryByEmail, type WaitlistEntryRecord } from "@/lib/repositories/waitlist-entries"
import type { WaitlistJoinInput } from "@/lib/validations/waitlist"

type WaitlistResult =
  | { status: "created"; entry: WaitlistEntryRecord }
  | { status: "duplicate"; entry: WaitlistEntryRecord }

export async function joinWaitlist(input: WaitlistJoinInput): Promise<WaitlistResult> {
  const inserted = await createWaitlistEntry(input)

  if (!inserted) {
    const existing = await findWaitlistEntryByEmail(input.email)
    if (!existing) {
      throw new Error("Failed to resolve duplicate waitlist entry")
    }

    return { status: "duplicate", entry: existing }
  }

  try {
    await sendWaitlistConfirmationEmail({
      to: inserted.email,
      name: inserted.name ?? undefined,
    })
  } catch (error) {
    if (!(error instanceof EmailSafetyPolicyError)) {
      throw error
    }
  }

  return { status: "created", entry: inserted }
}
