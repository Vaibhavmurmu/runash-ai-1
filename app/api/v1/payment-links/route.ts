import { NextResponse } from "next/server"
import { createPaymentLink, listPaymentLinks } from "@/lib/services/ecommerce-payment-store"

export async function GET() {
  try {
    const data = await listPaymentLinks()
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payment links" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.name || typeof body.amount !== "number") {
      return NextResponse.json({ success: false, error: "name and amount are required" }, { status: 400 })
    }

    const created = await createPaymentLink({
      name: body.name,
      amount: body.amount,
      description: body.description,
      currency: body.currency ?? "USD",
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create payment link" }, { status: 500 })
  }
}
