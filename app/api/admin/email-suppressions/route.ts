import { type NextRequest, NextResponse } from "next/server"
import { EmailBounceHandler } from "@/lib/email-bounce-handler"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.suppressions.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || undefined
    const search = searchParams.get("search") || undefined
    const is_permanent = searchParams.get("is_permanent") ? searchParams.get("is_permanent") === "true" : undefined
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50
    const offset = searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : 0

    const result = await EmailBounceHandler.getSuppressions({ type, search, is_permanent, limit, offset })

    return NextResponse.json({
      success: true,
      data: result.suppressions,
      total: result.total,
      pagination: { limit, offset, hasMore: offset + limit < result.total },
    })
  } catch (error) {
    console.error("Error fetching suppressions:", error)
    return NextResponse.json({ error: "Failed to fetch suppressions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.suppressions.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { email, type, reason } = body

    if (!email || !type) {
      return NextResponse.json({ error: "Email and type are required" }, { status: 400 })
    }

    const success = await EmailBounceHandler.addSuppression({ email, type, reason, is_permanent: true })

    if (!success) {
      return NextResponse.json({ error: "Failed to add suppression" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Suppression added successfully" })
  } catch (error) {
    console.error("Error adding suppression:", error)
    return NextResponse.json({ error: "Failed to add suppression" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.suppressions.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const success = await EmailBounceHandler.removeSuppression(email)

    if (!success) {
      return NextResponse.json({ error: "Suppression not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Suppression removed successfully" })
  } catch (error) {
    console.error("Error removing suppression:", error)
    return NextResponse.json({ error: "Failed to remove suppression" }, { status: 500 })
  }
}
