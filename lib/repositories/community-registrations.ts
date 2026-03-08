import { queryOne } from "@/lib/db"

export type CommunityEventRecord = {
  id: string
}

export type CommunityEventRegistrationRecord = {
  id: string
  eventId: string
  userId: string
  status: "registered"
  createdAt: string
  updatedAt: string
}

export async function findCommunityEventById(eventId: string): Promise<CommunityEventRecord | null> {
  return queryOne<CommunityEventRecord>(
    `
      SELECT id
      FROM community_events
      WHERE id = $1
      LIMIT 1
    `,
    [eventId],
  )
}

export async function findCommunityEventRegistration(
  eventId: string,
  userId: string,
): Promise<CommunityEventRegistrationRecord | null> {
  return queryOne<CommunityEventRegistrationRecord>(
    `
      SELECT
        id::text,
        event_id AS "eventId",
        user_id AS "userId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM community_event_registrations
      WHERE event_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [eventId, userId],
  )
}

export async function createCommunityEventRegistration(
  eventId: string,
  userId: string,
): Promise<CommunityEventRegistrationRecord | null> {
  return queryOne<CommunityEventRegistrationRecord>(
    `
      INSERT INTO community_event_registrations (event_id, user_id, status)
      VALUES ($1, $2, 'registered')
      ON CONFLICT (event_id, user_id) DO NOTHING
      RETURNING
        id::text,
        event_id AS "eventId",
        user_id AS "userId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [eventId, userId],
  )
}
