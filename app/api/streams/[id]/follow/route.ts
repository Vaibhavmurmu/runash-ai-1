import { type NextRequest, NextResponse } from "next/server"

const FOLLOW_COOKIE_KEY = "runash-live-follow"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const isFollowing = request.cookies.get(FOLLOW_COOKIE_KEY)?.value === params.id
  return NextResponse.json({ isFollowing })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const currentFollow = request.cookies.get(FOLLOW_COOKIE_KEY)?.value
  const isFollowing = currentFollow !== params.id

  const response = NextResponse.json({ isFollowing })

  if (isFollowing) {
    response.cookies.set({
      name: FOLLOW_COOKIE_KEY,
      value: params.id,
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    })
  } else {
    response.cookies.delete(FOLLOW_COOKIE_KEY)
  }

  return response
}
