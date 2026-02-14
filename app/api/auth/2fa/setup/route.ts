import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateTOTPSecret, setup2FA, verifyTOTPCode } from "@/lib/2fa"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const setupSchema = z.object({
  method: z.enum(["totp", "sms", "email"]),
  totpCode: z.string().optional(),
  totpSecret: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const method = searchParams.get("method")

    if (method === "totp") {
      const totpData = await generateTOTPSecret(Number.parseInt(session.user.id), session.user.email || "")
      return NextResponse.json(totpData)
    }

    return NextResponse.json({ error: "Invalid method" }, { status: 400 })
  } catch (error) {
    logApiRouteError(request, "auth.2fa.setup.get_failed", error, { errorCode: "AUTH_2FA_SETUP_GET_FAILED" })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { method, totpCode, totpSecret, phoneNumber, email } = setupSchema.parse(body)

    const userId = Number.parseInt(session.user.id)

    switch (method) {
      case "totp":
        if (!totpCode || !totpSecret) {
          return NextResponse.json({ error: "TOTP code and secret are required" }, { status: 400 })
        }

        // Verify the TOTP code before enabling
        const isValidTOTP = verifyTOTPCode(totpSecret, totpCode)
        if (!isValidTOTP) {
          return NextResponse.json({ error: "Invalid TOTP code" }, { status: 400 })
        }

        const totpSetup = await setup2FA(userId, totpSecret)
        if (!totpSetup) {
          return NextResponse.json({ error: "Failed to setup TOTP" }, { status: 500 })
        }

        return NextResponse.json({ message: "TOTP 2FA enabled successfully" })

      case "sms":
        if (!phoneNumber) {
          return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
        }

        const smsSetup = await setup2FA(userId, undefined, true, false)
        if (!smsSetup) {
          return NextResponse.json({ error: "Failed to setup SMS 2FA" }, { status: 500 })
        }

        return NextResponse.json({ message: "SMS 2FA enabled successfully" })

      case "email":
        const emailSetup = await setup2FA(userId, undefined, false, true)
        if (!emailSetup) {
          return NextResponse.json({ error: "Failed to setup Email 2FA" }, { status: 500 })
        }

        return NextResponse.json({ message: "Email 2FA enabled successfully" })

      default:
        return NextResponse.json({ error: "Invalid method" }, { status: 400 })
    }
  } catch (error) {
    logApiRouteError(request, "auth.2fa.setup.post_failed", error, { errorCode: "AUTH_2FA_SETUP_POST_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
