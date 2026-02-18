import { type NextRequest, NextResponse } from "next/server"
import { resendPhoneOtp, startPhoneOtp, verifyPhoneOtp } from "@/lib/auth/plugins/phone-otp"
import { logApiRouteError } from "@/lib/api/logging"

export async function POST(request: NextRequest) {
  try {
    return await startPhoneOtp(request)
  } catch (error) {
    logApiRouteError(request, "auth.phone_otp.start_failed", error, { errorCode: "AUTH_PHONE_OTP_START_FAILED" })
    return NextResponse.json({ success: false, message: "Failed to start phone verification" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await verifyPhoneOtp(request)
  } catch (error) {
    logApiRouteError(request, "auth.phone_otp.verify_failed", error, { errorCode: "AUTH_PHONE_OTP_VERIFY_FAILED" })
    return NextResponse.json({ success: false, message: "Failed to verify phone OTP" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await resendPhoneOtp(request)
  } catch (error) {
    logApiRouteError(request, "auth.phone_otp.resend_failed", error, { errorCode: "AUTH_PHONE_OTP_RESEND_FAILED" })
    return NextResponse.json({ success: false, message: "Failed to resend phone OTP" }, { status: 500 })
  }
}
