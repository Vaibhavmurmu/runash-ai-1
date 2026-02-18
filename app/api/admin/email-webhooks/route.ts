import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getWebhookDiagnostics } from "@/lib/email-webhooks/store"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.webhooks.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get("limit") || "100")
    const limit = Number.isNaN(limitParam) ? 100 : limitParam
    const provider = searchParams.get("provider") || undefined
    const status = searchParams.get("status") || undefined

    const diagnostics = await getWebhookDiagnostics({ limit, provider, status })

    return NextResponse.json({
      success: true,
      ...diagnostics,
    })
  } catch (error) {
    console.error("Error fetching email webhook diagnostics:", error)
    return NextResponse.json({ error: "Failed to fetch email webhook diagnostics" }, { status: 500 })
  }
}
