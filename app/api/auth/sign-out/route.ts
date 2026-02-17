import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const response = await auth.api.signOut({
    headers: request.headers,
  })

  return NextResponse.json(response)
}
