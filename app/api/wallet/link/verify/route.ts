import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.sessionId || !body?.code) {
    return NextResponse.json({ success: false, error: { message: "sessionId and code are required" } }, { status: 400 })
  }

  const result = WalletStore.verifyLinkSession(body.sessionId, body.code)
  if (!result.ok) {
    return NextResponse.json({ success: false, error: { message: result.message } }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: result })
}
