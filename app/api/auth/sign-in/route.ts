import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await auth.api.signInEmail({
    headers: request.headers,
    body: {
      email: body.email,
      password: body.password,
      callbackURL: body.callbackURL,
      rememberMe: body.rememberMe,
    },
  })

  return NextResponse.json(response)
}
