import { NextResponse } from "next/server"
import { createPaymentMethod, listPaymentMethods } from "@/lib/services/ecommerce-payment-store"
import { requireRoleBillingAccess } from "@/lib/billing-auth"
import { DEFAULT_ROLES } from "@/lib/rbac"

const OPERATOR_ROLES = [DEFAULT_ROLES.BUSINESS_OPERATOR, DEFAULT_ROLES.BUSINESS_ADMIN, DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN]

export async function GET() {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const data = await listPaymentMethods({
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payment methods" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const body = await request.json()

    if (!body?.id || !body?.name || !body?.provider || !body?.icon) {
      return NextResponse.json({ success: false, error: "id, name, provider and icon are required" }, { status: 400 })
    }

    const created = await createPaymentMethod(
      {
        id: body.id,
        name: body.name,
        provider: body.provider,
        icon: body.icon,
        connected: body.connected,
      },
      {
        userId: access.sessionUser.userId,
        organizationId: access.sessionUser.organizationId,
      },
    )

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create payment method" }, { status: 500 })
  }
}
