import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager } from "@/lib/profile-utils"

export async function GET(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const params = await context.params
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const profile = await ProfileManager.getProfileByUsername(params.username)

    if (!profile) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const following = await ProfileManager.getFollowing(profile.id, limit, offset)

    return NextResponse.json({ following })
  } catch (error) {
    console.error("Error fetching following:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
