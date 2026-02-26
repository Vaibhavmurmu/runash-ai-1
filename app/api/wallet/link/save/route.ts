import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.holderName || !body?.cardNumber || !body?.expMonth || !body?.expYear || !body?.email) {
    return NextResponse.json(
      { success: false, error: { message: "email, holderName, cardNumber, expMonth, expYear are required" } },
      { status: 400 },
    )
  }

  const card = await WalletStore.addCard({
    userId: body.userId,
    holderName: body.holderName,
    cardNumber: body.cardNumber,
    expMonth: Number(body.expMonth),
    expYear: Number(body.expYear),
    billingAddress: body.billingAddress,
    setDefault: true,
    brand: body.brand,
  })

  return NextResponse.json({
    success: true,
    data: {
      message: "Payment information saved securely for Link autofill",
      card,
    },
  })
}
