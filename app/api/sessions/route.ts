import { NextResponse } from "next/server"

import { createSession, listSessions } from "@/lib/repositories/runash-chat"

export async function GET() {
  const sessions = listSessions()
  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const newSession = createSession(typeof body?.title === "string" ? body.title : "Session")

  return NextResponse.json(newSession)
}
