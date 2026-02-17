import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logApiRouteError } from "@/lib/api/logging"

async function handleVerifyEmail(request: NextRequest, token: string) {
  await auth.api.verifyEmail({
    headers: request.headers,
    query: {
      token,
    },
  })

  return NextResponse.json({
    message: "Email verified successfully",
  })
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ message: "Verification token is required" }, { status: 400 })
    }

    return handleVerifyEmail(request, token)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ message: "Verification token is required" }, { status: 400 })
    }

    return handleVerifyEmail(request, token)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
