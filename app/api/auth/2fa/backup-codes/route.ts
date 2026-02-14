import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateBackupCodes, getBackupCodesStatus } from "@/lib/2fa"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const status = await getBackupCodesStatus(userId)

    return NextResponse.json(status)
  } catch (error) {
    logApiRouteError(request, "auth.2fa.backup_codes.status_failed", error, { errorCode: "AUTH_2FA_BACKUP_CODES_STATUS_FAILED" })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const backupCodes = await generateBackupCodes(userId)

    return NextResponse.json({ backupCodes })
  } catch (error) {
    logApiRouteError(request, "auth.2fa.backup_codes.generate_failed", error, { errorCode: "AUTH_2FA_BACKUP_CODES_GENERATE_FAILED" })
    return NextResponse.json({ error: "Failed to generate backup codes" }, { status: 500 })
  }
}
