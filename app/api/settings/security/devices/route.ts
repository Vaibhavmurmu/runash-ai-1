import { NextResponse } from "next/server"
import { z } from "zod"

import { listTrustedDevices, revokeTrustedDevice, trustUserDevice } from "@/lib/auth/session-modes"
import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const trustSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
  deviceName: z.string().trim().max(128).optional(),
})

const revokeSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
})

export async function GET(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  const devices = await listTrustedDevices(String(userId))
  return NextResponse.json({ devices })
}

export async function POST(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  const parsed = trustSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return settingsError({
      code: "INVALID_SECURITY_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("security", parsed.error),
    })
  }

  const trustedDevice = await trustUserDevice({
    userId: String(userId),
    deviceId: parsed.data.deviceId,
    deviceName: parsed.data.deviceName,
  })

  return NextResponse.json({ device: trustedDevice })
}

export async function DELETE(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return settingsError({
      code: "INVALID_SECURITY_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("security", parsed.error),
    })
  }

  await revokeTrustedDevice(String(userId), parsed.data.deviceId)
  return NextResponse.json({ revoked: true })
}
