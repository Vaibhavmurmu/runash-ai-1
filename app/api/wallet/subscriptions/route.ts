import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  return NextResponse.json({ success: true, data: WalletStore.listSubscriptions(userId) })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.subscriptionId || !body?.status) {
    return NextResponse.json({ success: false, error: { message: "subscriptionId and status are required" } }, { status: 400 })
  }
  const updated = WalletStore.updateSubscription(body.userId || "", body.subscriptionId, body.status)
  if (!updated) {
    return NextResponse.json({ success: false, error: { message: "Subscription not found" } }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: updated })
}
