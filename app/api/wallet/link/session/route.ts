import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.email) {
    return NextResponse.json({ success: false, error: { message: "email is required" } }, { status: 400 })
  }
  const session = WalletStore.createLinkSession({ userId: body.userId, email: body.email })
  return NextResponse.json({ success: true, data: session })
}
