import { NextResponse } from "next/server"
import { deletePaymentLink, updatePaymentLink } from "@/lib/services/ecommerce-payment-store"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const updated = await updatePaymentLink(params.id, body ?? {})

    if (!updated) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update payment link" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await deletePaymentLink(params.id)

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete payment link" }, { status: 500 })
  }
}
