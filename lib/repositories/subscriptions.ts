import { queryOne } from "@/lib/db"

export type SubscriptionRecord = {
  id: string
  email: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type UpsertSubscriptionInput = {
  email: string
  metadata?: Record<string, unknown>
}

export type UpsertSubscriptionResult = {
  createdNew: boolean
  record: SubscriptionRecord
}

export function normalizeSubscriptionEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

export async function findSubscriptionByEmail(email: string): Promise<SubscriptionRecord | null> {
  const normalizedEmail = normalizeSubscriptionEmail(email)
  if (!normalizedEmail) {
    return null
  }

  return queryOne<SubscriptionRecord>(
    `
      SELECT
        id::text,
        email,
        metadata,
        created_at AS "createdAt"
      FROM subscriptions
      WHERE LOWER(BTRIM(email)) = $1
      LIMIT 1
    `,
    [normalizedEmail],
  )
}

export async function upsertSubscription(input: UpsertSubscriptionInput): Promise<UpsertSubscriptionResult> {
  const normalizedEmail = normalizeSubscriptionEmail(input.email)
  if (!normalizedEmail) {
    throw new Error("Subscription email is required")
  }

  const inserted = await queryOne<SubscriptionRecord>(
    `
      INSERT INTO subscriptions (email, metadata)
      VALUES ($1, $2::jsonb)
      ON CONFLICT ON CONSTRAINT subscriptions_email_normalized_unique DO NOTHING
      RETURNING
        id::text,
        email,
        metadata,
        created_at AS "createdAt"
    `,
    [normalizedEmail, JSON.stringify(input.metadata ?? {})],
  )

  if (inserted) {
    return {
      createdNew: true,
      record: inserted,
    }
  }

  const existing = await findSubscriptionByEmail(normalizedEmail)
  if (!existing) {
    throw new Error("Failed to load existing subscription after unique-email conflict")
  }

  return {
    createdNew: false,
    record: existing,
  }
}
