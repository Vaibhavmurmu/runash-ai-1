import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)

  return NextResponse.json({
    authenticated: Boolean(session?.user?.id),
    role: session?.user?.role ?? null,
    userId: session?.user?.id ?? null,
  })
}
