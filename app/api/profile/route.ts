import { type NextRequest, NextResponse } from "next/server"
import { ProfileManager, profileUpdateSchema } from "@/lib/profile-utils"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const profile = await ProfileManager.getProfile(userId)

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const validationResult = profileUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const userId = Number.parseInt(session.user.id)
    const updatedProfile = await ProfileManager.updateProfile(userId, validationResult.data)

    if (!updatedProfile) {
      return NextResponse.json({ message: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    })
  } catch (error) {
    console.error("Error updating profile:", error)

    if (error instanceof Error && error.message === "Username is already taken") {
      return NextResponse.json({ message: "Username is already taken" }, { status: 409 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
