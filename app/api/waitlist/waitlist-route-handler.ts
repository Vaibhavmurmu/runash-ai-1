import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { rateLimit } from "@/lib/rate-limit"
import { waitlistJoinSchema, type WaitlistJoinInput } from "@/lib/validations/waitlist"

const WAITLIST_RATE_LIMIT = {
  key: "waitlist-join",
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const

type WaitlistJoinResult = {
  status: "created" | "duplicate"
  entry: {
    id: string
    email: string
    name: string | null
    useCase: string | null
    createdAt: string
  }
}

type WaitlistHandlerDependencies = {
  enforceRateLimit: typeof rateLimit
  join: (input: WaitlistJoinInput) => Promise<WaitlistJoinResult>
}

const defaultDependencies: WaitlistHandlerDependencies = {
  enforceRateLimit: rateLimit,
  join: async (input) => {
    const { joinWaitlist } = await import("@/lib/waitlist-service")
    return joinWaitlist(input)
  },
}

export async function handleWaitlistPost(
  request: NextRequest,
  dependencies: WaitlistHandlerDependencies = defaultDependencies,
): Promise<Response> {
  try {
    const rateLimitResult = await dependencies.enforceRateLimit(
      request,
      WAITLIST_RATE_LIMIT.key,
      WAITLIST_RATE_LIMIT.limit,
      WAITLIST_RATE_LIMIT.windowMs,
    )

    if (!rateLimitResult.success) {
      return respondError(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many waitlist requests. Please try again shortly.",
        },
        {
          status: 429,
          legacy: {
            message: "Too many waitlist requests. Please try again shortly.",
            retryAt: rateLimitResult.resetTime,
          },
        },
      )
    }

    const body = await request.json()
    const validated = waitlistJoinSchema.safeParse(body)

    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors
      return respondError(
        request,
        {
          code: "VALIDATION_FAILED",
          message: "Invalid waitlist payload",
          details: fieldErrors,
        },
        { status: 400, legacy: { message: "Invalid waitlist payload", errors: fieldErrors } },
      )
    }

    const result = await dependencies.join(validated.data)
    if (result.status === "duplicate") {
      return respondError(
        request,
        {
          code: "WAITLIST_DUPLICATE",
          message: "This email is already on the waitlist",
          details: { field: "email" },
        },
        { status: 409, legacy: { message: "This email is already on the waitlist" } },
      )
    }

    return respondSuccess(
      request,
      {
        message: "You’re on the waitlist! Please check your email for confirmation.",
        entry: {
          id: result.entry.id,
          email: result.entry.email,
          name: result.entry.name,
          useCase: result.entry.useCase,
          createdAt: result.entry.createdAt,
        },
      },
      {
        status: 201,
        legacy: {
          message: "You’re on the waitlist! Please check your email for confirmation.",
        },
      },
    )
  } catch (error) {
    logApiRouteError(request, "waitlist.join.failed", error, { errorCode: "WAITLIST_JOIN_FAILED" })

    return respondError(
      request,
      { code: "INTERNAL_ERROR", message: "Unable to join the waitlist right now" },
      { status: 500, legacy: { message: "Unable to join the waitlist right now" } },
    )
  }
}

export async function handleWaitlistPostRequest(
  request: Request,
  dependencies?: WaitlistHandlerDependencies,
): Promise<Response> {
  return handleWaitlistPost(request as NextRequest, dependencies)
}
