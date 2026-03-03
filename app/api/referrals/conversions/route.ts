import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { registerReferralConversion } from "@/lib/referral-service"
import { referralConversionSchema } from "@/lib/validations/referrals"

export async function POST(request: Request) {
  const session = await getServerAuthSession(new Headers(request.headers))
  const userId = session?.user?.id?.trim()

  if (!userId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = referralConversionSchema.safeParse(payload)

  if (!parsed.success) {
    return respondError(
      request,
      { code: "VALIDATION_FAILED", message: "Invalid referral conversion payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const result = await registerReferralConversion({
    data: parsed.data,
    convertedUserId: userId,
  })

  if (result.status === "not_found") {
    return respondError(request, { code: "REFERRAL_NOT_FOUND", message: "Referral invite not found." }, { status: 404 })
  }

  if (result.status === "already_converted") {
    return respondError(request, { code: "REFERRAL_ALREADY_CONVERTED", message: "Referral already converted." }, { status: 409 })
  }

  return respondSuccess(request, { conversion: result.conversion, totalConversions: result.totalConversions }, { status: 201 })
}
