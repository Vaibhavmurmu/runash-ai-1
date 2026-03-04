import { type NextRequest, NextResponse } from "next/server"
import { AdminSettings } from "@/lib/admin-settings"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

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
    return respondInternalServerError(request, error, {
      event: "admin.settings.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SETTINGS_READ_FAILED",
    })
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

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "admin.settings.updated",
      entityType: "admin_setting",
      entityId: `${category}:${key}`,
      metadata: {
        category,
        key,
        type,
        hasDescription: Boolean(description),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.settings.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SETTINGS_UPDATE_FAILED",
    })
  }
}
