import { sendFeedbackConfirmationEmail, sendFeedbackTriageEmail } from "@/lib/email"
import { createFeedbackEntry, listFeedbackEntriesForUser } from "@/lib/repositories/feedback-entries"
import type { FeedbackSubmitInput } from "@/lib/validations/feedback"

export async function submitFeedback(input: {
  userId: string
  userEmail?: string | null
  userName?: string | null
  data: FeedbackSubmitInput
}) {
  const entry = await createFeedbackEntry(input.userId, input.data)

  if (input.userEmail) {
    await sendFeedbackConfirmationEmail({
      to: input.userEmail,
      name: input.userName,
    })
  }

  const triageRecipient = process.env.FEEDBACK_TRIAGE_EMAIL
  if (triageRecipient) {
    await sendFeedbackTriageEmail({
      to: triageRecipient,
      userId: input.userId,
      score: input.data.score,
      message: input.data.message,
      source: input.data.source,
    })
  }

  return entry
}

export async function getFeedbackStatus(userId: string) {
  const entries = await listFeedbackEntriesForUser(userId, 10)

  return {
    total: entries.length,
    latest: entries[0] ?? null,
    entries,
  }
}
