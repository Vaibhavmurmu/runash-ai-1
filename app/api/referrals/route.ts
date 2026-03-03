import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { inviteReferral, getReferralStatus } from "@/lib/referral-service"
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit"
import { referralInviteSchema } from "@/lib/validations/referrals"

const REFERRAL_IP_LIMIT = { key: "referral-invite-ip", limit: 10, windowMs: 60 * 60 * 1000 } as const
const REFERRAL_USER_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 } as const

export async function GET(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const status = await getReferralStatus(userId)
  return respondSuccess(request, status, { status: 200 })
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const ipRate = await rateLimit(request, REFERRAL_IP_LIMIT.key, REFERRAL_IP_LIMIT.limit, REFERRAL_IP_LIMIT.windowMs)
  if (!ipRate.success) {
    return respondError(request, { code: "RATE_LIMITED", message: "Too many referral invites from this network." }, { status: 429 })
  }

  const userRate = await rateLimitByKey(`referral-invite-user:${userId}`, REFERRAL_USER_LIMIT.limit, REFERRAL_USER_LIMIT.windowMs)
  if (!userRate.success) {
    return respondError(request, { code: "RATE_LIMITED", message: "Too many referral invites for this account." }, { status: 429 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = referralInviteSchema.safeParse(payload)

  if (!parsed.success) {
    return respondError(
      request,
      { code: "VALIDATION_FAILED", message: "Invalid referral invite payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  if (session.user.email && session.user.email.toLowerCase() === parsed.data.email.toLowerCase()) {
    return respondError(request, { code: "SELF_INVITE_NOT_ALLOWED", message: "You cannot invite your own email." }, { status: 400 })
  }

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const result = await inviteReferral({
    inviterUserId: userId,
    inviterEmail: session.user.email,
    inviterName: session.user.name,
    ipAddress: forwardedIp,
    data: parsed.data,
  })

  if (result.status === "duplicate") {
    return respondError(
      request,
      { code: "REFERRAL_DUPLICATE", message: "An invite for this email already exists.", details: { invite: result.invite } },
      { status: 409 },
    )
  }

  return respondSuccess(request, { invite: result.invite }, { status: 201 })
}
