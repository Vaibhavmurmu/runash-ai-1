import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      id: session.user.id,
      name: session.user.name || "User",
      avatar: session.user.image || null,
      email: session.user.email || null,
      role: session.user.role || null,
    })
  } catch (error) {
    console.error("Error fetching current user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
