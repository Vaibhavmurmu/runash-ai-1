import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailContactManager } from "@/lib/email-contacts"
import { FilterValidationError, normalizePagination, parseOptionalInteger } from "@/lib/email-filter-utils"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.contacts.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || undefined
    const search = searchParams.get("search") || undefined
    const tags = (searchParams.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    const { limit, offset } = normalizePagination(
      parseOptionalInteger(searchParams.get("limit"), "limit"),
      parseOptionalInteger(searchParams.get("offset"), "offset"),
      { defaultLimit: 20, maxLimit: 200 },
    )

    const result = await EmailContactManager.getContacts({ status, search, tags, limit, offset })

    return NextResponse.json({
      success: true,
      data: result.contacts,
      total: result.total,
      pagination: { limit, offset, hasMore: offset + limit < result.total },
    })
  } catch (error) {
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error fetching email contacts:", error)
    return NextResponse.json({ error: "Failed to fetch email contacts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.contacts.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { email, name, status, metadata, source, tags } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (status && !EmailContactManager.isValidStatus(status)) {
      return NextResponse.json({ error: "Invalid contact status" }, { status: 400 })
    }

    const contact = await EmailContactManager.createContact({ email, name, status, metadata, source, tags })

    if (!contact) {
      return NextResponse.json({ error: "Contact already exists" }, { status: 409 })
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error("Error creating email contact:", error)
    return NextResponse.json({ error: "Failed to create email contact" }, { status: 500 })
  }
}
