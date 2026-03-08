import {
  createCommunityEventRegistration,
  findCommunityEventById,
  findCommunityEventRegistration,
  type CommunityEventRegistrationRecord,
} from "@/lib/repositories/community-registrations"

export type RegisterCommunityEventResult =
  | { status: "invalid_event" }
  | { status: "registration_closed" }
  | { status: "created"; registration: CommunityEventRegistrationRecord }
  | { status: "already_registered"; registration: CommunityEventRegistrationRecord }

export async function registerCommunityEvent(input: {
  eventId: string
  userId: string
  source: string
}): Promise<RegisterCommunityEventResult> {
  const event = await findCommunityEventById(input.eventId)
  if (!event) {
    return { status: "invalid_event" }
  }

  if (event.startsAt) {
    const startsAt = Date.parse(event.startsAt)
    if (Number.isFinite(startsAt) && startsAt <= Date.now()) {
      return { status: "registration_closed" }
    }
  }

  const created = await createCommunityEventRegistration(input.eventId, input.userId, input.source)
  if (created) {
    return { status: "created", registration: created }
  }

  const existing = await findCommunityEventRegistration(input.eventId, input.userId)
  if (!existing) {
    throw new Error("Community registration lookup failed after duplicate-safe insert")
  }

  return {
    status: "already_registered",
    registration: existing,
  }
}
