import { NextResponse } from "next/server"
import { z } from "zod"

type OtpPurpose = "login" | "registration" | "password_reset" | "2fa_setup" | "2fa_login"

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP code must be 6 digits"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

export type EmailOtpUser = {
  id: number
  email: string
  name: string | null
  role: string
}

export type VerifyEmailOtpDependencies = {
  verifyOtp: (code: string, identifier: string, purpose: OtpPurpose, type: "email") => Promise<{ success: boolean; message: string }>
  resolveOrCreateUserIdentity: (email: string) => Promise<EmailOtpUser | null>
  issueLoginSession: (user: EmailOtpUser, request: Request) => Promise<string>
  setSessionCookies: (response: NextResponse, sessionToken: string) => void
  onError: (request: Request, error: unknown) => NextResponse | Promise<NextResponse>
}

export async function handleVerifyEmailOtp(request: Request, dependencies: VerifyEmailOtpDependencies) {
  try {
    const body = await request.json()
    const { email, code, purpose } = verifyOTPSchema.parse(body)

    const result = await dependencies.verifyOtp(code, email, purpose, "email")

    if (!result.success || purpose !== "login") {
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    const user = await dependencies.resolveOrCreateUserIdentity(email)
    if (!user) {
      return NextResponse.json({ success: false, message: "Unable to resolve user identity" }, { status: 500 })
    }

    const sessionToken = await dependencies.issueLoginSession(user, request)

    const response = NextResponse.json(
      {
        ...result,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 },
    )

    dependencies.setSessionCookies(response, sessionToken)

    return response
  } catch (error) {
    return dependencies.onError(request, error)
  }
}
