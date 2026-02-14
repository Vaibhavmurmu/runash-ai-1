import { NextResponse } from "next/server"
import { createPaymentLink, listPaymentLinks } from "@/lib/services/ecommerce-payment-store"
import { requireRoleBillingAccess } from "@/lib/billing-auth"
import { DEFAULT_ROLES } from "@/lib/rbac"

const OPERATOR_ROLES = [DEFAULT_ROLES.STARTUP_OPERATOR, DEFAULT_ROLES.STARTUP_ADMIN, DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN]

export async function GET() {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const data = await listPaymentLinks({
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payment links" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const body = await request.json()

    if (!body?.name || typeof body.amount !== "number") {
      return NextResponse.json({ success: false, error: "name and amount are required" }, { status: 400 })
    }

    const created = await createPaymentLink(
      {
        name: body.name,
        amount: body.amount,
        description: body.description,
        currency: body.currency ?? "USD",
      },
      {
        userId: access.sessionUser.userId,
        organizationId: access.sessionUser.organizationId,
      },
    )

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create payment link" }, { status: 500 })
  }
}
