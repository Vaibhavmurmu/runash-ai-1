import { NextResponse } from "next/server"

const ERROR_CODES = {
  invalidRequest: "INVALID_REQUEST",
  unauthorized: "UNAUTHORIZED",
  invalidEvent: "INVALID_EVENT",
  alreadyRegistered: "ALREADY_REGISTERED",
  registrationClosed: "REGISTRATION_CLOSED",
  internal: "INTERNAL_ERROR",
} as const

export type RegisterCommunityEventResult =
  | { status: "invalid_event" }
  | { status: "registration_closed" }
  | {
      status: "created" | "already_registered"
      registration: {
        id: string
        status: "registered"
      }
    }

export type CommunityRegisterDependencies = {
  getSession: () => Promise<{ user?: { id?: string | null } | null } | null>
  register: (input: { eventId: string; userId: string; source: string }) => Promise<RegisterCommunityEventResult>
  audit: (input: {
    actorUserId: string
    outcome:
      | "unauthorized"
      | "invalid_request"
      | "invalid_event"
      | "registration_closed"
      | "already_registered"
      | "created"
    eventId?: string
    registrationId?: string
  }) => Promise<void>
}

export async function handleCommunityRegisterPostRequest(request: Request, dependencies: CommunityRegisterDependencies) {
  try {
    const session = await dependencies.getSession()
    const userId = session?.user?.id?.trim()

    if (!userId) {
      await dependencies.audit({ actorUserId: "anonymous", outcome: "unauthorized" })
      return NextResponse.json(
        { error: { code: ERROR_CODES.unauthorized, message: "Unauthorized" } },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : ""

    if (!eventId) {
      await dependencies.audit({ actorUserId: userId, outcome: "invalid_request" })
      return NextResponse.json(
        { error: { code: ERROR_CODES.invalidRequest, message: "eventId is required" } },
        { status: 400 },
      )
    }

    const result = await dependencies.register({ eventId, userId, source: "community_api" })

    if (result.status === "invalid_event") {
      await dependencies.audit({ actorUserId: userId, eventId, outcome: "invalid_event" })
      return NextResponse.json(
        { error: { code: ERROR_CODES.invalidEvent, message: "Invalid community event" } },
        { status: 404 },
      )
    }

    if (result.status === "registration_closed") {
      await dependencies.audit({ actorUserId: userId, eventId, outcome: "registration_closed" })
      return NextResponse.json(
        {
          error: { code: ERROR_CODES.registrationClosed, message: "Registration is closed for this event" },
        },
        { status: 409 },
      )
    }

    if (result.status === "already_registered") {
      await dependencies.audit({
        actorUserId: userId,
        eventId,
        registrationId: result.registration.id,
        outcome: "already_registered",
      })
      return NextResponse.json(
        {
          ok: true,
          code: ERROR_CODES.alreadyRegistered,
          eventId,
          registrationId: result.registration.id,
          status: result.registration.status,
          alreadyRegistered: true,
        },
        { status: 409 },
      )
    }

    await dependencies.audit({
      actorUserId: userId,
      eventId,
      registrationId: result.registration.id,
      outcome: "created",
    })

    return NextResponse.json(
      {
        ok: true,
        eventId,
        registrationId: result.registration.id,
        status: result.registration.status,
        alreadyRegistered: false,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: { code: ERROR_CODES.internal, message: "Unexpected error" } },
      { status: 500 },
    )
  }
}
