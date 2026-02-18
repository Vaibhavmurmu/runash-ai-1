import { type NextRequest, NextResponse } from "next/server"
import { getAuthSessionFromHeaders } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // Canonical server-side session source used by middleware and route handlers.
  const session = await getAuthSessionFromHeaders(request.headers)
  return NextResponse.json(session)
}
