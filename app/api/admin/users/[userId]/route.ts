import { type NextRequest, NextResponse } from "next/server"
import { UserManager } from "@/lib/user-management"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

const updateUserSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  avatar_url: z.string().url().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(params.id)
    const user = await UserManager.getUserById(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(params.id)
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Get admin user ID (you'd implement this based on your auth system)
    const adminId = Number.parseInt(session.user.id!)

    const updatedUser = await UserManager.updateUser(userId, validatedData, adminId)

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(params.id)
    const adminId = Number.parseInt(session.user.id!)

    await UserManager.deleteUser(userId, adminId)

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
