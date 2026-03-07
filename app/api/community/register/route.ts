import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { registerCommunityEvent } from "@/lib/services/community-registration-service"

const ERROR_CODES = {
  invalidRequest: "INVALID_REQUEST",
  unauthorized: "UNAUTHORIZED",
  invalidEvent: "INVALID_EVENT",
  alreadyRegistered: "ALREADY_REGISTERED",
  internal: "INTERNAL_ERROR",
} as const

/**
 * POST /api/community/register
 * Accepts { eventId } in JSON body.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    const userId = session?.user?.id?.trim()

    if (!userId) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.unauthorized, message: "Unauthorized" } },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : ""

    if (!eventId) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.invalidRequest, message: "eventId is required" } },
        { status: 400 },
      )
    }

    const result = await registerCommunityEvent({ eventId, userId })

    if (result.status === "invalid_event") {
      return NextResponse.json(
        { error: { code: ERROR_CODES.invalidEvent, message: "Invalid community event" } },
        { status: 404 },
      )
    }

    if (result.status === "already_registered") {
      return NextResponse.json(
        {
          ok: true,
          code: ERROR_CODES.alreadyRegistered,
          eventId,
          registrationId: result.registration.id,
          alreadyRegistered: true,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        eventId,
        registrationId: result.registration.id,
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
