import { NextResponse } from "next/server"
import { createPaymentMethod, listPaymentMethods } from "@/lib/services/ecommerce-payment-store"

export async function GET() {
  try {
    const data = await listPaymentMethods()
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payment methods" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.id || !body?.name || !body?.provider || !body?.icon) {
      return NextResponse.json({ success: false, error: "id, name, provider and icon are required" }, { status: 400 })
    }

    const created = await createPaymentMethod({
      id: body.id,
      name: body.name,
      provider: body.provider,
      icon: body.icon,
      connected: body.connected,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create payment method" }, { status: 500 })
  }
}
