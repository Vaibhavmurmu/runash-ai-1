import { queryOne } from "@/lib/db"

export type EmailSubscriptionStatus = "pending" | "confirmed" | "unsubscribed"

export type EmailSubscriptionRecord = {
  id: string
  email: string
  status: EmailSubscriptionStatus
  sourceRoute: string
  sourceCampaign: string | null
  userAgentHash: string | null
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
  unsubscribedAt: string | null
}

export type CreateEmailSubscriptionInput = {
  email: string
  sourceRoute: string
  sourceCampaign?: string | null
  userAgentHash?: string | null
  status?: EmailSubscriptionStatus
}

export type CreateEmailSubscriptionResult = {
  createdNew: boolean
  record: EmailSubscriptionRecord
}

export function normalizeSubscriptionEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

export async function findEmailSubscriptionByEmail(email: string): Promise<EmailSubscriptionRecord | null> {
  const normalizedEmail = normalizeSubscriptionEmail(email)
  if (!normalizedEmail) return null

  return queryOne<EmailSubscriptionRecord>(
    `
      SELECT
        id::text,
        email,
        status,
        source_route AS "sourceRoute",
        source_campaign AS "sourceCampaign",
        user_agent_hash AS "userAgentHash",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        confirmed_at AS "confirmedAt",
        unsubscribed_at AS "unsubscribedAt"
      FROM email_subscriptions
      WHERE LOWER(email) = $1
      LIMIT 1
    `,
    [normalizedEmail],
  )
}

export async function createEmailSubscription(input: CreateEmailSubscriptionInput): Promise<CreateEmailSubscriptionResult> {
  const normalizedEmail = normalizeSubscriptionEmail(input.email)
  const desiredStatus = input.status ?? "pending"

  const inserted = await queryOne<EmailSubscriptionRecord>(
    `
      INSERT INTO email_subscriptions (email, status, source_route, source_campaign, user_agent_hash, confirmed_at, unsubscribed_at)
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        CASE WHEN $2 = 'confirmed' THEN NOW() ELSE NULL END,
        CASE WHEN $2 = 'unsubscribed' THEN NOW() ELSE NULL END
      )
      ON CONFLICT DO NOTHING
      RETURNING
        id::text,
        email,
        status,
        source_route AS "sourceRoute",
        source_campaign AS "sourceCampaign",
        user_agent_hash AS "userAgentHash",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        confirmed_at AS "confirmedAt",
        unsubscribed_at AS "unsubscribedAt"
    `,
    [normalizedEmail, desiredStatus, input.sourceRoute, input.sourceCampaign ?? null, input.userAgentHash ?? null],
  )

  if (inserted) {
    return { createdNew: true, record: inserted }
  }

  const existing = await findEmailSubscriptionByEmail(normalizedEmail)
  if (!existing) {
    throw new Error("Failed to load existing subscription after unique-email conflict")
  }

  return { createdNew: false, record: existing }
}

export async function updateEmailSubscriptionStatus(email: string, status: EmailSubscriptionStatus): Promise<EmailSubscriptionRecord | null> {
  const normalizedEmail = normalizeSubscriptionEmail(email)
  if (!normalizedEmail) return null

  return queryOne<EmailSubscriptionRecord>(
    `
      UPDATE email_subscriptions
      SET
        status = $2,
        confirmed_at = CASE WHEN $2 = 'confirmed' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
        unsubscribed_at = CASE WHEN $2 = 'unsubscribed' THEN NOW() ELSE unsubscribed_at END,
        updated_at = NOW()
      WHERE LOWER(email) = $1
      RETURNING
        id::text,
        email,
        status,
        source_route AS "sourceRoute",
        source_campaign AS "sourceCampaign",
        user_agent_hash AS "userAgentHash",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        confirmed_at AS "confirmedAt",
        unsubscribed_at AS "unsubscribedAt"
    `,
    [normalizedEmail, status],
  )
}

export async function deleteEmailSubscription(email: string): Promise<EmailSubscriptionRecord | null> {
  const normalizedEmail = normalizeSubscriptionEmail(email)
  if (!normalizedEmail) return null

  return queryOne<EmailSubscriptionRecord>(
    `
      DELETE FROM email_subscriptions
      WHERE LOWER(email) = $1
      RETURNING
        id::text,
        email,
        status,
        source_route AS "sourceRoute",
        source_campaign AS "sourceCampaign",
        user_agent_hash AS "userAgentHash",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        confirmed_at AS "confirmedAt",
        unsubscribed_at AS "unsubscribedAt"
    `,
    [normalizedEmail],
  )
}
