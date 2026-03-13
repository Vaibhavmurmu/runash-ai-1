import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager } from "@/lib/profile-utils"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const params = await context.params
  try {
    const session = await getServerAuthSession()
    const viewerId = session?.user?.id ? Number.parseInt(session.user.id) : undefined

    const profile = await ProfileManager.getProfileByUsername(params.username, viewerId)

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 })
    }

    // Remove sensitive information for public profiles
    const publicProfile = {
      ...profile,
      email: undefined, // Never expose email in public profiles
    }

    return NextResponse.json({ profile: publicProfile })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
