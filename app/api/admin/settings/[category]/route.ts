import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { requirePermission } from "@/lib/auth-middleware"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest, { params }: { params: { category: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await requirePermission(session.user.id, "admin.settings.view")
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const settings = await AdminSettings.getByCategory(params.category)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("Category settings fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch category settings" }, { status: 500 })
  }
}
