import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { respondInternalServerError } from "@/lib/api/admin-route-utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.settings.category.read",
  })
  if (!auth.success) return auth.response

  try {
    const { category } = await params
    const settings = await AdminSettings.getByCategory(category)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.settings.category.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SETTINGS_CATEGORY_READ_FAILED",
    })
  }
}
