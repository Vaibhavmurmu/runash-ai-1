import { NextResponse } from "next/server"
import { deletePaymentMethod, updatePaymentMethod } from "@/lib/services/ecommerce-payment-store"
import { requireRoleBillingAccess } from "@/lib/billing-auth"
import { DEFAULT_ROLES } from "@/lib/rbac"

const OPERATOR_ROLES = [DEFAULT_ROLES.BUSINESS_OPERATOR, DEFAULT_ROLES.BUSINESS_ADMIN, DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN]

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const body = await request.json()
    const updated = await updatePaymentMethod(params.id, body ?? {}, {
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: "Payment method not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update payment method" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const deleted = await deletePaymentMethod(params.id, {
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Payment method not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete payment method" }, { status: 500 })
  }
}
