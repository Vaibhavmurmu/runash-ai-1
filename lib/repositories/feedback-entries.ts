import { queryMany, queryOne } from "@/lib/db"
import type { FeedbackSubmitInput } from "@/lib/validations/feedback"

export type FeedbackEntryRecord = {
  id: string
  userId: string
  score: number
  message: string
  source: string
  status: "new" | "triaged" | "resolved"
  createdAt: string
}

export async function createFeedbackEntry(userId: string, input: FeedbackSubmitInput): Promise<FeedbackEntryRecord> {
  const row = await queryOne<FeedbackEntryRecord>(
    `
      INSERT INTO feedback_entries (user_id, score, message, source)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id::text,
        user_id AS "userId",
        score,
        message,
        source,
        status,
        created_at AS "createdAt"
    `,
    [userId, input.score, input.message, input.source],
  )

  if (!row) {
    throw new Error("Failed to create feedback entry")
  }

  return row
}

export async function listFeedbackEntriesForUser(userId: string, limit = 10): Promise<FeedbackEntryRecord[]> {
  return queryMany<FeedbackEntryRecord>(
    `
      SELECT
        id::text,
        user_id AS "userId",
        score,
        message,
        source,
        status,
        created_at AS "createdAt"
      FROM feedback_entries
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  )
}
