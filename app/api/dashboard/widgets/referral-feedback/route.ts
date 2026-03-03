import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getFeedbackStatus } from "@/lib/feedback-service"
import { getReferralStatus } from "@/lib/referral-service"

export async function GET(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const [feedback, referrals] = await Promise.all([getFeedbackStatus(userId), getReferralStatus(userId)])
  return respondSuccess(request, { feedback, referrals }, { status: 200 })
}
