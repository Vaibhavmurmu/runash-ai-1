import { NextResponse } from "next/server"

import { createSession, listSessions } from "@/lib/repositories/runash-chat"

function getRequestUserId(req: Request) {
  const userId = req.headers.get("x-runash-user-id")
  return typeof userId === "string" ? userId : undefined
}

export async function GET(req: Request) {
  const sessions = await listSessions(getRequestUserId(req))
  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const newSession = await createSession(
    typeof body?.title === "string" ? body.title : "Session",
    getRequestUserId(req),
  )

  return NextResponse.json(newSession)
}
