import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager } from "@/lib/profile-utils"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ username: string }> }) {
  const params = await routeParamsPromise
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const profile = await ProfileManager.getProfileByUsername(params.username)

    if (!profile) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const followers = await ProfileManager.getFollowers(profile.id, limit, offset)

    return NextResponse.json({ followers })
  } catch (error) {
    console.error("Error fetching followers:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
