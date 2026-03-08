import { queryOne } from "@/lib/db"

export type NewsletterSubscriptionStatus = "subscribed" | "unsubscribed"

export type NewsletterSubscriptionRecord = {
  id: string
  email: string
  status: NewsletterSubscriptionStatus
  source: string
  consentedAt: string
  createdAt: string
  updatedAt: string
}

export type UpsertNewsletterSubscriptionInput = {
  email: string
  source: string
  status?: NewsletterSubscriptionStatus
  consentedAt?: string
}

export type UpsertNewsletterSubscriptionResult = {
  createdNew: boolean
  record: NewsletterSubscriptionRecord
}

export function normalizeNewsletterEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

export async function findNewsletterSubscriptionByEmail(email: string): Promise<NewsletterSubscriptionRecord | null> {
  const normalizedEmail = normalizeNewsletterEmail(email)
  if (!normalizedEmail) {
    return null
  }

  return queryOne<NewsletterSubscriptionRecord>(
    `
      SELECT
        id::text,
        email,
        status,
        source,
        consented_at AS "consentedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM newsletter_subscriptions
      WHERE LOWER(email) = $1
      LIMIT 1
    `,
    [normalizedEmail],
  )
}

export async function upsertNewsletterSubscription(
  input: UpsertNewsletterSubscriptionInput,
): Promise<UpsertNewsletterSubscriptionResult> {
  const normalizedEmail = normalizeNewsletterEmail(input.email)
  if (!normalizedEmail) {
    throw new Error("Newsletter subscription email is required")
  }

  const status = input.status ?? "subscribed"
  const consentedAt = input.consentedAt ?? new Date().toISOString()

  const inserted = await queryOne<NewsletterSubscriptionRecord>(
    `
      INSERT INTO newsletter_subscriptions (email, status, source, consented_at)
      VALUES ($1, $2, $3, $4::timestamptz)
      ON CONFLICT DO NOTHING
      RETURNING
        id::text,
        email,
        status,
        source,
        consented_at AS "consentedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [normalizedEmail, status, input.source, consentedAt],
  )

  if (inserted) {
    return { createdNew: true, record: inserted }
  }

  const existing = await findNewsletterSubscriptionByEmail(normalizedEmail)
  if (!existing) {
    throw new Error("Failed to load newsletter subscription after conflict")
  }

  return { createdNew: false, record: existing }
}
