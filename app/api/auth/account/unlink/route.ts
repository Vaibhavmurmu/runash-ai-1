import { type NextRequest, NextResponse } from "next/server"
import { evaluateAccountUnlinkingPolicy } from "@/lib/auth/plugins/account-linking-policy"
import { recordAuthMetric } from "@/lib/auth-observability"

interface UnlinkPayload {
  providerId?: string
  hasAlternativeSignInMethod?: boolean
  stepUpVerified?: boolean
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as UnlinkPayload

  if (!body.providerId) {
    return NextResponse.json({ success: false, error: "providerId is required" }, { status: 400 })
  }

  const policy = evaluateAccountUnlinkingPolicy({
    providerId: body.providerId,
    hasAlternativeSignInMethod: Boolean(body.hasAlternativeSignInMethod),
    hasRecentStepUpVerification: body.stepUpVerified === true,
  })

  if (!policy.allowed) {
    recordAuthMetric("auth.account_unlink.denied", {
      providerId: body.providerId,
      reason: policy.reason,
    })
    return NextResponse.json({ success: false, error: policy.reason }, { status: 403 })
  }

  recordAuthMetric("auth.account_unlink.allowed", {
    providerId: body.providerId,
  })

  return NextResponse.json({
    success: true,
    message: "Account unlink policy check passed. Integrate provider unlink persistence in adapter.",
  })
}
