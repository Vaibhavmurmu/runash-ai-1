import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  return NextResponse.json({ success: true, data: await WalletStore.listCards(userId) })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.holderName || !body?.cardNumber || !body?.expMonth || !body?.expYear) {
    return NextResponse.json({ success: false, error: { message: "holderName, cardNumber, expMonth, expYear are required" } }, { status: 400 })
  }

  const created = await WalletStore.addCard({
    userId: body.userId,
    holderName: body.holderName,
    cardNumber: body.cardNumber,
    expMonth: Number(body.expMonth),
    expYear: Number(body.expYear),
    brand: body.brand,
    billingAddress: body.billingAddress,
    setDefault: Boolean(body.setDefault),
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}
