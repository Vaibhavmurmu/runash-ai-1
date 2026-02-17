import { NextResponse } from "next/server"
import type { RecordingSettings } from "@/types/recording"
import { getServerAuthSession } from "@/lib/auth/session"

const defaultSettings: RecordingSettings = {
  autoRecord: true,
  recordAudio: true,
  recordVideo: true,
  quality: "high",
  format: "mp4",
  storage: "cloud",
  maxStorageGB: 50,
  autoDelete: false,
  autoDeleteAfterDays: 30,
  saveChat: true,
  createHighlights: true,
}

export async function GET() {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ settings: defaultSettings })
}

export async function PUT(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = (await req.json()) as RecordingSettings

    return NextResponse.json({
      success: true,
      settings: {
        ...defaultSettings,
        ...settings,
      },
    })
  } catch (error) {
    console.error("Update recording settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
