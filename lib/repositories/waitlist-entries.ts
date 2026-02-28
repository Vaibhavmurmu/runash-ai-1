import { queryOne } from "@/lib/db"
import type { WaitlistJoinInput } from "@/lib/validations/waitlist"

export type WaitlistEntryRecord = {
  id: string
  email: string
  name: string | null
  company: string | null
  useCase: string | null
  createdAt: string
}

export async function createWaitlistEntry(input: WaitlistJoinInput): Promise<WaitlistEntryRecord | null> {
  return queryOne<WaitlistEntryRecord>(
    `
      INSERT INTO waitlist_entries (email, name, company, use_case)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
      RETURNING
        id::text,
        email,
        name,
        company,
        use_case AS "useCase",
        created_at AS "createdAt"
    `,
    [input.email, input.name ?? null, input.company ?? null, input.useCase ?? null],
  )
}

export async function findWaitlistEntryByEmail(email: string): Promise<WaitlistEntryRecord | null> {
  return queryOne<WaitlistEntryRecord>(
    `
      SELECT
        id::text,
        email,
        name,
        company,
        use_case AS "useCase",
        created_at AS "createdAt"
      FROM waitlist_entries
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  )
}
