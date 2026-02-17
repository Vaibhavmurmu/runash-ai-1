import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest, { params }: { params: { category: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.settings.category.read",
  })
  if (!auth.success) return auth.response

  try {
    const settings = await AdminSettings.getByCategory(params.category)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("Category settings fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch category settings" }, { status: 500 })
  }
}
