import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getFeedbackStatus, submitFeedback } from "@/lib/feedback-service"
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit"
import { feedbackSubmitSchema } from "@/lib/validations/feedback"

const FEEDBACK_IP_LIMIT = { key: "feedback-submit-ip", limit: 8, windowMs: 10 * 60 * 1000 } as const
const FEEDBACK_USER_LIMIT = { limit: 12, windowMs: 10 * 60 * 1000 } as const

export async function GET(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const status = await getFeedbackStatus(userId)
  return respondSuccess(request, status, { status: 200 })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const ipRate = await rateLimit(request, FEEDBACK_IP_LIMIT.key, FEEDBACK_IP_LIMIT.limit, FEEDBACK_IP_LIMIT.windowMs)
  if (!ipRate.success) {
    return respondError(request, { code: "RATE_LIMITED", message: "Too many feedback requests from this network." }, { status: 429 })
  }

  const userRate = await rateLimitByKey(`feedback-submit-user:${userId}`, FEEDBACK_USER_LIMIT.limit, FEEDBACK_USER_LIMIT.windowMs)
  if (!userRate.success) {
    return respondError(request, { code: "RATE_LIMITED", message: "Too many feedback requests for this account." }, { status: 429 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = feedbackSubmitSchema.safeParse(payload)

  if (!parsed.success) {
    return respondError(
      request,
      { code: "VALIDATION_FAILED", message: "Invalid feedback payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const entry = await submitFeedback({
    userId,
    userEmail: session.user.email,
    userName: session.user.name,
    data: parsed.data,
  })

  return respondSuccess(request, { entry }, { status: 201 })
}
