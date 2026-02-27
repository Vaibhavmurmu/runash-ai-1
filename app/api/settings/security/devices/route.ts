import { NextResponse } from "next/server"
import { z } from "zod"

import { listTrustedDevices, revokeTrustedDevice, trustUserDevice } from "@/lib/auth/session-modes"
import { resolveSettingsUserId } from "@/lib/settings-security"

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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const devices = await listTrustedDevices(String(userId))
  return NextResponse.json({ devices })
}

export async function POST(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = trustSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  await revokeTrustedDevice(String(userId), parsed.data.deviceId)
  return NextResponse.json({ revoked: true })
}
