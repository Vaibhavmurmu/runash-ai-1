import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { logAdminActivity, requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.settings.read",
  })
  if (!auth.success) return auth.response

  try {
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
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.settings.update",
  })
  if (!auth.success) return auth.response

  try {
    const { category, key, value, type, description } = await request.json()

    await AdminSettings.set(category, key, value, type, auth.session.user.id, description)

    await logAdminActivity(
      auth.session.user.id,
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
