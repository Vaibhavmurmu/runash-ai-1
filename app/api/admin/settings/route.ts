import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { requirePermission, logAdminActivity } from "@/lib/auth-middleware"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await requirePermission(session.user.id, "admin.settings.view")
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    if (category) {
      const settings = await AdminSettings.getByCategory(category)
      return NextResponse.json({ success: true, data: settings })
    }

    const categories = await AdminSettings.getAllCategories()
    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await requirePermission(session.user.id, "admin.settings.manage")
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { category, key, value, type, description } = await request.json()

    await AdminSettings.set(category, key, value, type, session.user.id, description)

    await logAdminActivity(
      session.user.id,
      "settings_update",
      { category, key, value, type },
      request.headers.get("x-forwarded-for") || "unknown",
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
