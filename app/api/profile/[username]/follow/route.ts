import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager } from "@/lib/profile-utils"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const targetProfile = await ProfileManager.getProfileByUsername(params.username)

    if (!targetProfile) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const result = await ProfileManager.toggleFollow(userId, targetProfile.id)

    return NextResponse.json({
      message: result.isFollowing ? "User followed successfully" : "User unfollowed successfully",
      isFollowing: result.isFollowing,
    })
  } catch (error) {
    console.error("Error toggling follow:", error)

    if (error instanceof Error && error.message === "Cannot follow yourself") {
      return NextResponse.json({ message: "Cannot follow yourself" }, { status: 400 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
