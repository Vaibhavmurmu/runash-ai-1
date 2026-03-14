import { NextResponse } from "next/server"
import { deletePaymentLink, getPaymentLinkById, updatePaymentLink } from "@/lib/services/ecommerce-payment-store"
import { requireRoleBillingAccess } from "@/lib/billing-auth"
import { DEFAULT_ROLES } from "@/lib/rbac"

const OPERATOR_ROLES = [
  DEFAULT_ROLES.STARTUP_OPERATOR,
  DEFAULT_ROLES.STARTUP_ADMIN,
  DEFAULT_ROLES.CUSTOMER_OPERATOR,
  DEFAULT_ROLES.CUSTOMER_ADMIN,
  DEFAULT_ROLES.CUSTOMER_FINANCE,
  DEFAULT_ROLES.ADMIN,
  DEFAULT_ROLES.SUPER_ADMIN,
]

export async function GET(_: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const link = await getPaymentLinkById(params.id, {
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })

    if (!link) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: link })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payment link" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const body = await request.json()
    const updated = await updatePaymentLink(params.id, body ?? {}, {
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update payment link" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  return PUT(request, { params })
}

export async function DELETE(_: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireRoleBillingAccess(OPERATOR_ROLES)
  if ("response" in access) return access.response

  try {
    const deleted = await deletePaymentLink(params.id, {
      userId: access.sessionUser.userId,
      organizationId: access.sessionUser.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete payment link" }, { status: 500 })
  }
}
